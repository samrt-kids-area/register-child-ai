import sys
import face_recognition
import json

image_path = sys.argv[1]
encoding = json.loads(sys.argv[2])

# تحميل الصورة
image = face_recognition.load_image_file(image_path)

# اكتشاف الوجوه
face_locations = face_recognition.face_locations(image)
face_encodings = face_recognition.face_encodings(image, face_locations)

for i, face_encoding in enumerate(face_encodings):
    match = face_recognition.compare_faces([encoding], face_encoding)[0]
    if match:
        top, right, bottom, left = face_locations[i]
        width = right - left
        height = bottom - top
        print(json.dumps({
            "found": True,
            "box": {
                "top": top,
                "left": left,
                "width": width,
                "height": height
            }
        }))
        exit()

print(json.dumps({ "found": False }))