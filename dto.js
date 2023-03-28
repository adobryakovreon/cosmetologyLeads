const createDealDTO = (newPrice, dealId) => {
	return {
		id: dealId,
		price: newPrice,
	};
};

const createTaskDTO = (entity_type, entity_id, task_type_id, complete_till, text) => {
	return {
		entity_type,
		entity_id,
		task_type_id,
		complete_till,
		text,
	};
};

const createNoteDTO = (element_type, element_id, note_type, params) => {
	return {
		element_type,
		element_id,
		note_type,
		params,
	};
};

module.exports = {
	createDealDTO,
	createTaskDTO,
	createNoteDTO,
};