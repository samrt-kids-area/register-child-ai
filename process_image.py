import sys
import face_recognition
import json

image_path = sys.argv[1]
image = face_recognition.load_image_file(image_path)
encodings = face_recognition.face_encodings(image)

if encodings:
    print(json.dumps(encodings[0].tolist()))  # Convert to JSON string
else:
    print(json.dumps([]))  # Return empty array