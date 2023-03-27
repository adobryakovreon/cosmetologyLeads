const {CUSTOMER_SERVICES_ID, TASK_ID, DEAL_SERVICE_ID, COMPARE} = require('./constants');
const api = require('./api');

// поиск основного контакта - возвращает DTO контакта, полученного по его id
const findMainCustomer = async (customers) => {
	const customerId = customers.find(customer => customer.is_main === true).id;
	return api.getContact(customerId);
};


// Вычисление новой цены по выбранным из мультисписка услугам
const getNewPrice = (customerServices, dealServices) => {
	let newPrice = 0;
	customerServices.forEach(service => {
		const {field_id, values} = service;
		// ищем совпадения по совмещенным ключам в COMPARE и вычисляем новую цену
		const includePrice = dealServices.find(dealService => field_id === COMPARE[dealService.enum_id]);	
		if (includePrice) {
			newPrice += Number(values[0].value);
		}
	});
	return newPrice;
};


// Обновление цены сделки
const updatePrice = async (newPrice, dealId) => {
	const priceDTO = {
		id: dealId,
		price: newPrice
	};
	await api.updateDeal(priceDTO, dealId);
};


// Создание и отправка новой задачи с заранее известным типом (task_type_id)
// и сущностью (entity_id), к которой она привязана
const setTask = async (entity_type, entity_id, eventName) => {
	const existedTasks = await api.getTasks('leads', entity_id, TASK_ID, false);
	if(typeof existedTasks !== 'string') {
		console.log(`${eventName}Task already exist`);
		return;
	} else {
		await api.createTask(
			entity_type,
			entity_id,
			TASK_ID,
			Math.floor(Date.now()/1000) + 86400,
			'Проверить бюджет',
		);
		console.log(`${eventName}Добавлена задача в сделке ${entity_id}`);
	}
};


const main = async (leadDTO, eventName) => {
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
	// Из сделки выгружаем кастомные поля нужных нам услуг основного контакта
	const {contacts} = deal._embedded;
	if (contacts.length) {
		const customerServices = (await findMainCustomer(contacts)).custom_fields_values.filter(
			service => CUSTOMER_SERVICES_ID.includes(service.field_id)
		);
		const newPrice = getNewPrice(customerServices,dealServices,price);
		// Вычисляем newPrice и сравниваем со старой ценой, если отличается, 
		// то обновляем бюджет и выполняем шаг 2 - создаем задачу "Проверить бюджет"
		if (newPrice !== Number(price)) {
			await setTask('leads', Number(id), eventName);
			await updatePrice(newPrice, id);
			console.log(`${eventName}Цена в сделке ${id} изменена, новая цена - ${newPrice}`);
		} else console.log(`${eventName}Цена прежняя, обновления не произошло`);	
	} else {
		console.log(`Нет закрепленных контактов`);
		api.createNote('2', id, 'common', 'Добавьте контакт в сделку и проверьте поля "Услуги"');
	}
};


module.exports = main;