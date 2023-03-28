const DEAL_SERVICE_ID = 433147;

const CONTACT_SERVICES_ID = [433021,433027,433029,433039,433041];
const CONTACT_SERVICE_CUSTOM_FIELDS_VALUES = [
	{ id: 433021, name: 'Лазерное омоложение лица' },
	{ id: 433027, name: 'Ультразвуковой лифтинг' },
	{ id: 433029, name: 'Лазерное удаление сосудов' },
	{ id: 433039, name: 'Коррекция мимических морщин' },
	{ id: 433041, name: 'Лазерная эпиляция' },
];



const TASK_TYPE_ID = 2850306;
const ONE_DAY_IN_SECONDS = 86400;
const MILLISECONDS_PER_SECONDS = 1000;

// сопоставление id кастомных полей контакта с кастомными элементами мультисписка

module.exports = {
	CONTACT_SERVICES_ID,
	TASK_TYPE_ID,
	DEAL_SERVICE_ID,
	ONE_DAY_IN_SECONDS,
	MILLISECONDS_PER_SECONDS,
	CONTACT_SERVICE_CUSTOM_FIELDS_VALUES,
};
