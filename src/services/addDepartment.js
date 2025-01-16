const db = require("../config");
const { ADD_DEPARTMENT, GET_DEPARTMENTS } = require('../constants/queries');

const addDepartmentService = async (name) => {
    try {
        const [results] = await db.query(ADD_DEPARTMENT, [name]);
        return results;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Department already exists');
        }
        throw error;
    }
};

const getDepartmentsService = async () => {
    try {
        const [results] = await db.query(GET_DEPARTMENTS);
        return results;
    } catch (error) {
        throw error;
    }
};

module.exports = { addDepartmentService, getDepartmentsService };