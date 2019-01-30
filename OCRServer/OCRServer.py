import os
import numpy as np
import argparse
import cv2

from flask import Flask, render_template, Response, jsonify, request, send_file, send_from_directory, json
from pprint import pprint
from pyimagesearch.transform import four_point_transform
import imutils
from skimage.filters import threshold_local
from PIL import Image
import pytesseract

from skimage import io
import uuid
import util

UPLOAD_FOLDER = './uploads'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def transform_file(url):
    #https://scontent.xx.fbcdn.net/v/t1.15752-9/50713959_334622277158667_8415253865435234304_n.jpg?_nc_cat=104&_nc_ad=z-m&_nc_cid=0&_nc_ht=scontent.xx&oh=75f64393125e385fce0f9768cb4e80e4&oe=5CB8495E
    image = io.imread(url)
    
    # load the image and compute the ratio of the old height
	# to the new height, clone it, and resize it
    #orig = image.copy()
    #ratio = image.shape[0] / 500.0
    #image = imutils.resize(image, height=500)

    orig = image.copy()
    downscaled_height = 700.0
    image, scale = util.downscale(image, downscaled_height)

    # convert the image to grayscale, blur it, and find edges
	# in the image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    kern_size = 5
    gray_blurred = cv2.medianBlur(gray, kern_size)

    threshold_lower = 40
    threshold_upper = 150
    edged = cv2.Canny(gray_blurred, threshold_lower, threshold_upper)
    edged = cv2.GaussianBlur(edged, (3, 3), 0)

    print ('STEP 1: Edge Detection')

    # find the contours in the edged image, keeping only the
    # largest ones, and initialize the screen contour
    (cnts, _) = cv2.findContours(edged.copy(), cv2.RETR_LIST,
                             cv2.CHAIN_APPROX_SIMPLE)
    #cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:4]

    # loop over the contours
    screenCnt = []

    for c in cnts:
        # approximate the contour
        peri = cv2.arcLength(c, True)
        #approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        approx = cv2.approxPolyDP(c, 0.015 * peri, True)

    	# if our approximated contour has four points, then we
    	# can assume that we have found our screen
        print("lenapprox:", len(approx))
        if len(approx) == 4:
            screenCnt = approx
            break

    print ('STEP 2: Find contours of paper')
    if screenCnt.__len__() != 0:
    
    	# apply the four point transform to obtain a top-down
    	# view of the original image
        warped = four_point_transform(orig, screenCnt.reshape(4, 2) * scale)
    else:
        warped = orig

	# convert the warped image to grayscale, then threshold it
	# to give it that 'black and white' paper effect

    warped = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    T = threshold_local(warped, 251, offset = 10)
    warped = (warped > T).astype("uint8") * 255

	# Save transformed image
    filename = my_random_string(6) + ".jpg"
    print(filename)
    cv2.imwrite(os.path.join(app.config['UPLOAD_FOLDER'], filename), warped)

    # Perform OCR
    config = ("-l eng --oem 1 --psm 4 --tessdata-dir /usr/share/tesseract-ocr/4.00/tessdata")
    ocr = pytesseract.image_to_string(Image.open(os.path.join(app.config['UPLOAD_FOLDER'], filename)), config=config)
    #ocr = pytesseract.image_to_string(Image.open(os.path.join(app.config['UPLOAD_FOLDER'], filename)))
    print(ocr)
    #os.remove(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    return(ocr)

def my_random_string(string_length=10):
    """Returns a random string of length string_length."""
    random = str(uuid.uuid4()) # Convert UUID format to a Python string.
    random = random.upper() # Make all characters uppercase.
    random = random.replace("-","") # Remove the UUID '-'.
    return random[0:string_length] # Return the random string.

def toJSON(self):
    return {"result": {'ocr': self}}

@app.route('/scan', methods = ['GET'])
def index():
    url = request.query_string.decode("utf-8") 
    url = url[4:]
    print(url)

    warped = transform_file(url)
    return (json.dumps(toJSON(warped)))
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
