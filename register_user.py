import sys
import cv2
import numpy as np
from pymongo import MongoClient
import cloudinary
from cloudinary.uploader import upload
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch
import os

# MongoDB setup
mongo_client = MongoClient("mongodb+srv://ah01211293047:1Sc5YkBzDBYORnbA@cluster0.5h4nt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
db = mongo_client["test"]  # Database name
collection = db["Children"]  # Collection name

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME = "dc4d0qogi"
CLOUDINARY_API_KEY = "733831993459773"
CLOUDINARY_API_SECRET = "tuScJhURWVovXQn1d6P_WrnQfkg"
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

def register_user(name, image_path,parent):
    try:
        # Check if the user already exists in MongoDB
        existing_user = collection.find_one({"name": name})
        if existing_user:
            print("Error: User already registered!")
            return

        # Read the image from the file path
        frame = cv2.imread(image_path)
        if frame is None:
            print("Error: Failed to read the image!")
            return

        # Convert BGR (OpenCV) to RGB (required by facenet-pytorch)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Initialize MTCNN for face detection and InceptionResnetV1 for embeddings
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        mtcnn = MTCNN(keep_all=True, device=device)  # Detect all faces
        resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

        # Detect faces in the image
        faces, _ = mtcnn.detect(rgb_frame)
        if faces is None or len(faces) == 0:
            print("Error: No face detected! Please try again.")
            return

        # Extract the first detected face (assuming one face per image for registration)
        face_box = faces[0]  # [x1, y1, x2, y2]
        x1, y1, x2, y2 = [int(coord) for coord in face_box]
        face_crop = rgb_frame[y1:y2, x1:x2]

        # Resize the face to 160x160 (required by InceptionResnetV1)
        face_resized = cv2.resize(face_crop, (160, 160))

        # Convert to tensor and normalize
        face_tensor = torch.tensor(face_resized.transpose(2, 0, 1)).float() / 255.0  # Shape: [3, 160, 160]
        face_tensor = face_tensor.unsqueeze(0).to(device)  # Add batch dimension: [1, 3, 160, 160]

        # Generate face embedding
        with torch.no_grad():
            face_encoding = resnet(face_tensor).cpu().numpy()[0]  # Shape: [512]

        # Upload the image to Cloudinary
        result = upload(image_path)
        image_url = result.get("url")  # Get the public URL of the uploaded image

        # Save user data to MongoDB
        user_data = {
            "name": name,
            "encoding": face_encoding.tolist(),  # Store the face embedding as a list
            "photo": image_url,  # Store the image URL
            "parent": parent
        }
        collection.insert_one(user_data)

        print("Success: User registered successfully!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python register_user.py <name> <image_path>")
        sys.exit(1)

    name = sys.argv[1]
    image_path = sys.argv[2]
    register_user(name, image_path)