/**
 * Основной модуль приложения - точка входа. 
 */

const express = require('express');
const config = require('./config');
const main = require('./task');
const {createNote} = require('./api');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/updateLead', async (req, res) => {
	const eventName = `${new Date(Date.now()).getSeconds()},	update:	`;
	const [updateEventDTO] =  req.body.leads.update;
	await main(updateEventDTO, eventName);
	res.send('LEAD UPDATED');
});

app.post('/addLead', async (req, res) => {
	const eventName = `${new Date(Date.now()).getSeconds()},	add:	`;
	const [addEventDTO] =  req.body.leads.add;
	await main(addEventDTO, eventName);
	res.send('LEAD ADDED');
});

app.post('/completeTask', async (req, res) => {
	const [{element_type, element_id, status}] = req.body.task.update;
	if (status === '1') {
		await createNote(
			element_type,
			element_id,
			'common',
			'Бюджет проверен, ошибок нет.'
		);
	}
	res.send('TASK COMPLETE');
});

app.listen(config.PORT, () => console.log('Server started on ', config.PORT));
