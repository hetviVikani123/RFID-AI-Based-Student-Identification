import React, { useState } from 'react';
import { ScrollView, View, Text, Alert, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FaceDetector from 'expo-face-detector';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';

type FaceComparisonResult = {
  verified: boolean;
  distance: number;
  threshold: number;
  model: string;
  detector_backend: string;
  similarity_metric: string;
  time: number;
};

type VerificationResponse = {
  isVerified: boolean;
  error?: string;
  result?: FaceComparisonResult;
};

const FaceVerification = ({ storedPhoto, onVerificationComplete, onCancel }: {
  storedPhoto: string;
  onVerificationComplete: (result: VerificationResponse) => void;
  onCancel: () => void;
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://192.168.40.35/verify';

  const takePhoto = async () => {
    setError(null);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
      await detectAndCropFace(result.assets[0]);
    }
  };

  const detectAndCropFace = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    try {
      setProcessing(true);

      const faceDetectionResult = await FaceDetector.detectFacesAsync(imageAsset.uri, {
        mode: FaceDetector.FaceDetectorMode.fast,
        detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
        runClassifications: FaceDetector.FaceDetectorClassifications.none,
      });

      if (faceDetectionResult.faces.length === 0) {
        setProcessing(false);
        setError('No face detected. Please try again.');
        return;
      }

      const face = faceDetectionResult.faces[0];
      const { origin, size } = face.bounds;

      const padding = size.width * 0.2;
      const cropX = Math.max(0, origin.x - padding);
      const cropY = Math.max(0, origin.y - padding);
      const cropWidth = Math.min(size.width + padding * 2, imageAsset.width - cropX);
      const cropHeight = Math.min(size.height + padding * 2, imageAsset.height - cropY);

      const croppedImage = await ImageManipulator.manipulateAsync(
        imageAsset.uri,
        [{
          crop: {
            originX: cropX,
            originY: cropY,
            width: cropWidth,
            height: cropHeight,
          },
        }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      setImageUri(croppedImage.uri);
      await compareFaces(storedPhoto, croppedImage.base64!);
    } catch (error) {
      console.error('Error detecting or cropping face:', error);
      setError('Failed to process image. Please try again.');
      setProcessing(false);
    }
  };

  const compareFaces = async (storedImageBase64: string, capturedImageBase64: string) => {
    try {
      setProcessing(true);
      setError(null);

      // Remove base64 prefix if present
      const cleanStoredBase64 = storedImageBase64.split(',')[1] || storedImageBase64;
      const cleanCapturedBase64 = capturedImageBase64.split(',')[1] || capturedImageBase64;

      // Log first few characters of base64 strings for debugging
      console.log('Stored Base64:', cleanStoredBase64.substring(0, 50));
      console.log('Captured Base64:', cleanCapturedBase64.substring(0, 50));

      const payload = {
        img1: cleanStoredBase64,
        img2: cleanCapturedBase64,
      };

      const response = await axios.post(API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // Increased to 60 seconds
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const verificationResult: VerificationResponse = {
        isVerified: response.data.verified,
        result: response.data,
      };

      onVerificationComplete(verificationResult);
    } catch (error: any) {
      console.error('Face comparison error:', error.message, error.stack);
      let errorMessage = 'Failed to compare faces. Please try again.';
      if (error.response) {
        errorMessage = error.response.data.error || `Server error: ${error.response.status}`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your network or server.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Server unreachable. Ensure the server is running and accessible.';
      }

      const verificationResult: VerificationResponse = {
        isVerified: false,
        error: errorMessage,
      };
      onVerificationComplete(verificationResult);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Face Verification</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <Text style={styles.instruction}>Take a photo of your face for verification</Text>
      )}

      {processing && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.processingText}>
            {imageUri ? 'Verifying...' : 'Processing...'}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.captureButton]}
          onPress={takePhoto}
          disabled={processing}
        >
          <Text style={styles.buttonText}>
            {imageUri ? 'Retake Photo' : 'Take Photo'}
          </Text>
        </TouchableOpacity>

        {imageUri && !processing && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f4f8',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  instruction: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  processingBox: {
    marginVertical: 20,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#2c3e50',
    marginTop: 10,
  },
  errorBox: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ef9a9a',
    maxWidth: '80%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  captureButton: {
    backgroundColor: '#3498db',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FaceVerification;
