from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import torch

# Load a sample image (replace with your own if you want)

img_path = 'test.jpg'  # Put an image in the same folder as this script
img = Image.open(img_path)

# Create models
device = 'mps' if torch.backends.mps.is_available() else 'cpu'
mtcnn = MTCNN(keep_all=False, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# Detect face
face = mtcnn(img)
if face is not None:
    print("Face detected.")
    face = face.to(device)
    embedding = resnet(face.unsqueeze(0))
    print("Embedding shape:", embedding.shape)
else:
    print("No face detected.")