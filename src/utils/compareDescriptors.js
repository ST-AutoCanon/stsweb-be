// utils/compareDescriptors.js

// Function to compare the face descriptor from the camera and stored descriptor
exports.compareDescriptors = (descriptor1, descriptor2) => {
    let distance = 0;
    // Assuming descriptor is an array of numbers, calculate distance here
    // For example, you can use Euclidean distance or cosine similarity
    // This is a placeholder function, adjust the logic as per your face recognition library
    distance = Math.sqrt(
      descriptor1.reduce((sum, val, idx) => sum + Math.pow(val - descriptor2[idx], 2), 0)
    );
    return distance;
  };
  