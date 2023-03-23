/**
 * Основной модуль приложения - точка входа. 
 */

const express = require("express");
const api = require("./api");
const logger = require("./logger");
const config = require("./config");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// финальный результат летит в параметр price
// смотрим в результаты getFieldValues(custom_field_values, sevices_id) для сделки и для контакта
// создаем два идентичных массива для мультимписка сделки и списка услуг контакта по принципу
// с одной лишь разницей - в массиве контакта у элемента есть поле price - его то мы и суммируем
// идем по двум массивам по такому принципу - если у элемента массива сделки есть флаг "Выбрано",
// то к результату прибавляем значение этого же параметра из массива контактов
// результат сравниваем со значением price, если он отличается, то создаем/изменяем? задачу типа "проверить"
// делаем хук на проверку закрытия задачи -> создаем примечание к этой задааче "Бюджет проверен, ошибок нет"

const findMainCustomer = async (customers) => {
	const customerId = customers.find(customer => customer.is_main === true).id;
	return api.getContact(customerId);
};

const updatePrice = (customerServices, dealServices, price) => {
	let newPrice = 0;
	dealServices.forEach(dealService => {
		newPrice += customerServices.find(customerService => customerService.id === dealService).price;
	});
	return newPrice > price ? newPrice : price; 
	
};

/**
 	standart array to work with:
 	services: [
		{
			service_id:number,
			service_name:string,
			//service_price:number,
			service_is_selected: boolean,
		}.
		{
			...
		},
		{
			...
		},
	]
*/

const DEAL_SERVICE_ID = 433147;

const main = async (leadDTO) => {
	const {price, id} = leadDTO;
	// выгрузил сделку и из нее забрал поле "Услуги"
	const deal = await api.getDeal(id, ["contacts"]);
	const [dealServices] = deal.custom_fields_values;
	console.log(dealServices.values);
	// из сделки выгрузил основной контакт
	const {contacts} = deal._embedded;
	const mainCustomer = await findMainCustomer(contacts);
	const customerServices = mainCustomer.custom_fields_values;
	dealServices.values.forEach(service => {
		const {value} = service;
		console.log(value);	
		customerServices.forEach(service => {
			const {field_name} = service;
			console.log(service);
		});
	});
	
};



app.post("/updateLead", (req, res) => {
	console.log("/updateLead");
	const [updateEventDTO] =  req.body.leads.update;
	main(updateEventDTO);
	res.send("OK");
});
	
app.post("/addLead", (req, res) => {
	console.log("/addLead");
	const [addEventDTO] =  req.body.leads.add;
	main(addEventDTO);
	res.send("OK");
});


app.listen(config.PORT, () => logger.debug("Server started on ", config.PORT));
