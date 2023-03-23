/**
 * Модуль для работы c API amoCRM
 * Модуль используется для работы в NodeJS.
 */

const axios = require("axios");
const querystring = require("querystring");
const fs = require("fs");
const axiosRetry = require("axios-retry");
const config = require("./config");
const logger = require("./logger");

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const AMO_TOKEN_PATH = "amo_token.json";

const LIMIT = 200;

function Api() {
	let access_token = null;
	let refresh_token = null;
	const ROOT_PATH = `https://${config.SUB_DOMAIN}.amocrm.ru`;

	const authChecker = (request) => {
		return (...args) => {
			if (!access_token) {
				return this.getAccessToken().then(() => authChecker(request)(...args));
			}
			return request(...args).catch((err) => {
				logger.error(err.response);
				logger.error(err);
				logger.error(err.response.data);
				const data = err.response.data;
				if ("validation-errors" in data) {
					data["validation-errors"].forEach(({ errors }) => logger.error(errors));
					logger.error("args", JSON.stringify(args, null, 2));
				}
				if (data.status == 401 && data.title === "Unauthorized") {
					logger.debug("Нужно обновить токен");
					return refreshToken().then(() => authChecker(request)(...args));
				}
				throw err; 
			});
		};
	};

	const requestAccessToken = () => {
		return axios
			.post(`${ROOT_PATH}/oauth2/access_token`, {
				client_id: config.CLIENT_ID,
				client_secret: config.CLIENT_SECRET,
				grant_type: "authorization_code",
				code: config.AUTH_CODE,
				redirect_uri: config.REDIRECT_URI,
			})
			.then((res) => {
				logger.debug("Свежий токен получен");
				return res.data;
			})
			.catch((err) => {
				logger.error(err.response.data);
				throw err;
			});
	};

	const getAccessToken = async () => {
		if (access_token) {
			return Promise.resolve(access_token);
		}
		try {
			const content = fs.readFileSync(AMO_TOKEN_PATH);
			const token = JSON.parse(content);
			access_token = token.access_token;
			refresh_token = token.refresh_token;
			return Promise.resolve(token);
		} catch (error) {
			logger.error(`Ошибка при чтении файла ${AMO_TOKEN_PATH}`, error);
			logger.debug("Попытка заново получить токен");
			const token = await requestAccessToken();
			fs.writeFileSync(AMO_TOKEN_PATH, JSON.stringify(token));
			access_token = token.access_token;
			refresh_token = token.refresh_token;
			return Promise.resolve(token);
		}
	};

	const refreshToken = () => {
		return axios
			.post(`${ROOT_PATH}/oauth2/access_token`, {
				client_id: config.CLIENT_ID,
				client_secret: config.CLIENT_SECRET,
				grant_type: "refresh_token",
				refresh_token: refresh_token,
				redirect_uri: config.REDIRECT_URI,
			})
			.then((res) => {
				logger.debug("Токен успешно обновлен");
				const token = res.data;
				fs.writeFileSync(AMO_TOKEN_PATH, JSON.stringify(token));
				access_token = token.access_token;
				refresh_token = token.refresh_token;
				return token;
			})
			.catch((err) => {
				logger.error("Не удалось обновить токен");
				logger.error(err.response.data);
			});
	};

	this.getAccessToken = getAccessToken;
	// Получить сделку по id
	this.getDeal = authChecker((id, withParam = []) => {
		return axios
			.get(
				`${ROOT_PATH}/api/v4/leads/${id}?${querystring.encode({
					with: withParam.join(","),
				})}`,
				{
					headers: {
						Authorization: `Bearer ${access_token}`,
					},
				}
			)
			.then((res) => res.data);
	});

	// Получить сделки по фильтрам
	this.getDeals = authChecker(({ page = 1, limit = LIMIT, filters }) => {
		const url = `${ROOT_PATH}/api/v4/leads?${querystring.stringify({
			page,
			limit,
			with: ["contacts"],
			...filters,
		})}`;

		return axios
			.get(url, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => {
				return res.data ? res.data._embedded.leads : [];
			});
	});

	// Обновить сделки
	this.updateDeals = authChecker((data) => {
		return axios.patch(`${ROOT_PATH}/api/v4/leads`, [].concat(data), {
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
	});

	// Создать сделки
	this.createDeals = authChecker((data) => {
		return axios.post(`${ROOT_PATH}/api/v4/leads`, [].concat(data), {
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
	});

	// Получить контакты
	this.getContacts = authChecker(({ page = 1, limit = LIMIT }) => {
		const url = `${ROOT_PATH}/api/v4/contacts?${querystring.stringify({
			page,
			limit,
			with: ["leads"],
		})}`;
		return axios
			.get(url, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => {
				return res.data ? res.data._embedded.contacts : [];
			});
	});

	// Получить контакт по id
	this.getContact = authChecker((id) => {
		return axios
			.get(`${ROOT_PATH}/api/v4/contacts/${id}?${querystring.stringify({
				with: ["leads"]
			})}`, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => res.data);
	});

	// Обновить контакты
	this.updateContacts = authChecker((data) => {
		return axios.patch(`${ROOT_PATH}/api/v4/contacts`, [].concat(data), {
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
	});

	// Создать контакты
	this.createContacts = authChecker((data) => {
		return axios.post(`${ROOT_PATH}/api/v4/contacts`, [].concat(data), {
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
	});

	// Создать задачи
	this.createTasks = authChecker((data) => {
		const tasksData = [].concat(data);
		return axios.post(`${ROOT_PATH}/api/v4/tasks`, tasksData, {
			headers: {
				Authorization: `Bearer ${access_token}`,
			},
		});
	});

	// Получить данные воронки по ее id
	this.getPipeline = authChecker((pipelineId) => {
		return axios
			.get(`${ROOT_PATH}/api/v4/leads/pipelines/${pipelineId}`, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => res.data);
	});

	// Получить данные по статусу воронки по id воронки и id статуса
	this.getStatus = authChecker(({ pipelineId, statusId }) => {
		return axios
			.get(
				`${ROOT_PATH}/api/v4/leads/pipelines/${pipelineId}/statuses/${statusId}`,
				{
					headers: {
						Authorization: `Bearer ${access_token}`,
					},
				}
			)
			.then((res) => res.data);
	});

	// Получить данные пользователя crm по его id
	this.getUser = authChecker((userId) => {
		return axios
			.get(`${ROOT_PATH}/api/v4/users/${userId}`, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => res.data);
	});

	// Получить данные всех пользователей crm
	this.getUsers = authChecker(({ page = 1, limit = LIMIT }) => {
		const url = `${ROOT_PATH}/api/v4/users?${querystring.stringify({
			page,
			limit,
		})}`;
		return axios
			.get(url, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			})
			.then((res) => {
				return res.data ? res.data._embedded.users : [];
			});
	});
}

module.exports = new Api();
