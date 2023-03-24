/**
 * Основной модуль приложения - точка входа. 
 */

const express = require("express");
const api = require("./api");
const logger = require("./logger");
const config = require("./config");
const {CUSTOMER_SERVICES_ID, TASK_ID, DEAL_SERVICE_ID} = require("./constants");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// финальный результат летит в параметр price
// результат сравниваем со значением price, если он отличается, то создаем/изменяем? задачу типа "проверить"
// делаем хук на проверку закрытия задачи -> создаем примечание к этой задааче "Бюджет проверен, ошибок нет"

const findMainCustomer = async (customers) => {
	const customerId = customers.find(customer => customer.is_main === true).id;
	return api.getContact(customerId);
};

const getNewPrice = (customerServices, dealServices) => {
	let newPrice = 0;
	customerServices.forEach(service => {
		const name = service.field_name;
		const exist = dealServices.find(service => name === service.value);	
		if (exist) {
			newPrice += Number(service.values[0].value);
		}
	});
	return newPrice;
};

const updatePrice = async (newPrice, dealId) => {
	const priceDTO = {
		id: dealId,
		price: newPrice
	};
	await api.updateDeal(priceDTO, dealId);
};

const setTask = async (entity_id, eventName) => {
	const existedTasks = await api.getTasks("leads", entity_id, TASK_ID);
	if(typeof existedTasks !== "string") {
		console.log(`${eventName}Task already exist`);
		return;
	} else {
		const taskDTO = {
			task_type_id: TASK_ID,
			text: "Проверить бюджет",
			complete_till: Math.floor(Date.now()/1000) + 86400,
			entity_id: entity_id,
			entity_type: "leads"	
		};
		await api.createTasks(taskDTO);
		console.log(`${eventName}Добавлена задача в сделке ${entity_id}`);
	}
};



const main = async (leadDTO, eventName) => {
	const {price, id} = leadDTO;
	// Выгружаем сделку и из нее берем мультисписок "Услуги"
	const deal = await api.getDeal(id, ["contacts"]);
	// исправь
	const dealServices = deal.custom_fields_values
		? deal.custom_fields_values.find(
			custom_field => custom_field.field_id === DEAL_SERVICE_ID)
			.values
		: [];
	// Из сделки выгружаем кастомные поля нужных нам услуг основного контакта
	const {contacts} = deal._embedded;
	const customerServices = (await findMainCustomer(contacts)).custom_fields_values.filter(
		service => CUSTOMER_SERVICES_ID.includes(service.field_id)
	);
	// Вычисляем newPrice и сравниваем со старой ценой, если отличается, 
	// то обновляем бюджет и выполняем шаг 2 - создаем задачу "Проверить бюджет"
	const newPrice = getNewPrice(customerServices,dealServices,price);

	if (newPrice !== Number(price)) {
		await setTask(Number(id), eventName);
		await updatePrice(newPrice, id);
		console.log(`${eventName}Цена в сделке ${id} изменена, новая цена - ${newPrice}`);
	} else console.log(`${eventName}Цена прежняя, обновления не произошло`);
};


app.post("/updateLead", async (req, res) => {
	const eventName = `${new Date(Date.now()).getSeconds()},	update:	`;
	const [updateEventDTO] =  req.body.leads.update;
	await main(updateEventDTO, eventName);
	res.send("LEAD UPDATED");
});
	
app.post("/addLead", async (req, res) => {
	const eventName = `${new Date(Date.now()).getSeconds()},	add:	`;
	const [addEventDTO] =  req.body.leads.add;
	await main(addEventDTO, eventName);
	res.send("LEAD ADDED");
});

app.post("/completeTask", async (req, res) => {
	const [taskEventBody] = req.body.task.update;
	console.log(taskEventBody);
	if (taskEventBody.status === "1") {
		const noteDTO = {
			entity_type: taskEventBody.element_type,
			entity_id: taskEventBody.element_id,
			note_type: "common",
			params: {
				"text": "Бюджет проверен, ошибок нет"
			}
		};
		await api.createNodes(noteDTO);
	}
	res.send("TASK COMPLETE");
});

app.listen(config.PORT, () => logger.debug("Server started on ", config.PORT));
