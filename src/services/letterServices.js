
const db = require('../config');
const {
  INSERT_LETTER,
  UPDATE_LETTER_BY_ID,
  GET_ALL_LETTERS,
  GET_LETTER_BY_ID,
  GET_LATEST_LETTER_ID
} = require('../config');

const insertLetter = async (letterData) => {
  try {
    const [result] = await db.query(INSERT_LETTER, letterData);
    return result;
  } catch (error) {
    console.error('Error in insertLetter:', error.message, error.stack);
    throw error;
  }
};

const updateLetterById = async (letterData, letterId) => {
  try {
    const [result] = await db.query(UPDATE_LETTER_BY_ID, [...letterData, letterId]);
    return result;
  } catch (error) {
    console.error('Error in updateLetterById:', error.message, error.stack);
    throw error;
  }
};

const getAllLetters = async () => {
  try {
    const [rows] = await db.query(GET_ALL_LETTERS);
    return rows;
  } catch (error) {
    console.error('Error in getAllLetters:', error.message, error.stack);
    throw error;
  }
};

const getLetterById = async (letterId) => {
  try {
    const [rows] = await db.query(GET_LETTER_BY_ID, [letterId]);
    return rows[0];
  } catch (error) {
    console.error('Error in getLetterById:', error.message, error.stack);
    throw error;
  }
};

const getLatestLetterId = async () => {
  try {
    const [rows] = await db.query(GET_LATEST_LETTER_ID);
    return rows[0]?.letter_id || null;
  } catch (error) {
    console.error('Error in getLatestLetterId:', error.message, error.stack);
    throw error;
  }
};

module.exports = {
  insertLetter,
  updateLetterById,
  getAllLetters,
  getLetterById,
  getLatestLetterId,
};