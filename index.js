/**
 * Основной модуль приложения - точка входа. 
 */

const express = require('express');
const config = require('./config');
const {dealUpdater} = require('./task');
const {createNoteDTO} = require('./dto');
const {createNote} = require('./api');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post('/leads', async (req,res) => {
	const event = req.body.leads;
	const [eventName] = Object.keys(event);
	await dealUpdater(event[eventName][0]);
	res.send();
});

app.post('/completeTask', async (req, res) => {
	const [{element_type, element_id, status}] = req.body.task.update;
	if (status === '1') {
		const noteDTO = createNoteDTO(element_type,element_id,'common',{text:'Бюджет проверен, ошибок нет.'});
		await createNote(noteDTO);
	}
	res.send('TASK COMPLETE');
});

app.listen(config.PORT, () => console.log('Server started on ', config.PORT));
