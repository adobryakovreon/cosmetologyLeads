const {
	CONTACT_SERVICES_ID,
	TASK_TYPE_ID, 
	DEAL_SERVICE_ID,
	ONE_DAY_IN_SECONDS,
	MILLISECONDS_PER_SECONDS,
	CONTACT_SERVICE_CUSTOM_FIELDS_ID,
} = require('./constants');
const api = require('./api');
const {createDealDTO,createTaskDTO} = require('./dto');
// const taskDTO = require('./dto/task.dto');
// поиск основного контакта - возвращает DTO контакта, полученного по его id

// Вычисление новой цены по выбранным из мультисписка услугам
const getNewPrice = (customerServices, dealServices) => {
	let newPrice = 0;
	console.log(dealServices);
	customerServices.forEach(service => {
		const {field_id, values} = service;
		const serviceName = CONTACT_SERVICE_CUSTOM_FIELDS_ID.find(field => field.id = field_id).name;
		// ищем совпадения по совмещенным ключам в COMPARE и вычисляем новую цену
		const includePrice = dealServices.find(dealService => serviceName === dealService.value);	
		if (includePrice) {
			newPrice += Number(values[0].value);
		}
	});
	return newPrice;
};

const dealUpdater = async (leadDTO) => {
	const {price, id} = leadDTO;
	// Выгружаем сделку и из нее берем мультисписок "Услуги"
	const deal = await api.getDeal(id, ['contacts']);
	// Если в сделке есть кастомные поля, то мы находим нужный нам мультисписок
	// и сохраняем его поля в массив
	const dealServices = deal.custom_fields_values
		? deal.custom_fields_values.find(
			custom_field => custom_field.field_id === DEAL_SERVICE_ID)
			.values
		: [];

	console.log(dealServices);
	// Из сделки выгружаем кастомные поля нужных нам услуг основного контакта
	const {contacts} = deal._embedded;
	if (contacts.length > 0) {
		const mainContactId = contacts.find(contact => contact.is_main).id;
		const mainContact = await api.getContact(mainContactId);
		const contactServices = mainContact.custom_fields_values.filter(
			service => CONTACT_SERVICES_ID.includes(service.field_id)
		);
		const newPrice = getNewPrice(contactServices,dealServices,price);
		// Вычисляем newPrice и сравниваем со старой ценой, если отличается, 
		// то обновляем бюджет и выполняем шаг 2 - создаем задачу "Проверить бюджет"
		if (newPrice !== Number(price)) {
			const taskQueryParams = {
				entity_type: 'leads',
				entity_id: Number(id),
				task_type_id: TASK_TYPE_ID,
				is_completed: false,
			};
			const existedTasks = await api.getTasks(taskQueryParams);
			if (existedTasks.length === 0) {
				const taskDTO = createTaskDTO(
					'leads',
					Number(id),
					TASK_TYPE_ID,
					Math.floor(Date.now()/MILLISECONDS_PER_SECONDS) + ONE_DAY_IN_SECONDS,
					'Проверить бюджет'
				);
				await api.createTask(taskDTO);
			} else {
				console.log(`Task already exist`);
			}
			const updatedDealDTO = createDealDTO(newPrice, id);
			await api.updateDeal(updatedDealDTO, id);
		}
	} else {
		console.log(`Нет закрепленных контактов`);
		// await api.createTask('2', id, 'common', 'Добавьте контакт в сделку и проверьте поля "Услуги"');
	}
};


module.exports = {
	dealUpdater
};