# Student Verification System with Face Recognition

A comprehensive mobile application for student verification using ID cards and facial recognition technology. The system includes device registration, student data retrieval, and face verification capabilities.

## Features

- **Device Registration**: Secure device registration with IMEI and PIN
- **Student Verification**: 
  - ID card scanning (simulated)
  - Student data retrieval from API
  - Face verification using DeepFace
- **User Interface**:
  - Animated React Native components
  - Responsive design for various screen sizes
  - Clear status indicators
- **Security**:
  - Device authentication
  - Secure credential storage
- **Error Handling**: Comprehensive error handling and logging

## Technology Stack

- **Frontend**: React Native with TypeScript
- **Backend**: FastAPI (Python)
- **Face Recognition**: DeepFace library
- **State Management**: React hooks
- **Storage**: AsyncStorage for device credentials
- **Animation**: React Native Animatable


### Prerequisites

- Node.js (v14+)
- Python (3.10)
- React Native development environment
- Expo CLI (optional)
- Android/iOS simulator or physical device

### Backend Setup

1. Install Python dependencies:

    - npm install expo-build-properties --legacy-peer-deps
    - npm install expo@latest
    - pip install tf-keras
    - pip install deepface
    - pip install --upgrade tensorflow
    - npm install react-native-animatable --legacy-peer-deps
    - pip install fastapi uvicorn deepface opencv-python numpy python-multipart
    - pip install fastapi uvicorn deepface opencv-python numpy
   
2. Run the backend server:
   uvicorn main:app --host  <Your IPv4 Address>  --port 5000 --reload

### Configuration

1. Update the API base URL in App.js:

  const API_BASE_URL = 'https://your-api-endpoint.com/api';

2.For development, you can use the local FastAPI server:

  const API_BASE_URL = 'http://192.168.x.x:5000';

### API Endpoints

**Backend (FastAPI)**
POST /verify: Compare two facial images and return verification result

**Mobile App**
POST /DeviceRegestration: Register a new device

GET /CardVerify: Verify student card and retrieve details
   
"# RFID-AI-Based-Student-Identification" 
