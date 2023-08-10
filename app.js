const express = require('express');
const https = require('https');

class HyperAttr {
    constructor(jsonObj) {
        for (const key in jsonObj) {
            if (jsonObj.hasOwnProperty(key)) {
                this[key] = typeof jsonObj[key] === 'object' ? new HyperAttr(jsonObj[key]) : jsonObj[key];
            }
        }
    }
}

class HyperGPT {
    constructor(baseApi) {
        this.baseApi = baseApi;
        this.commonErr = [
            'Please provide a prompt for {}',
            'It looks like an invalid model was provided: {}',
            'Getting an error from server code: {}',
            'An error occurred: {}'
        ];
        this.chatModels = ['gpt', 'llama', 'bard'];
        this.imgModels = ['art', 'photography', '3d'];
    }

    _response(data, isJsonObject) {
        if (typeof data === 'string') {
            return data;
        }

        if (typeof data === 'object') {
            let jsonObj;
            try {
                jsonObj = JSON.parse(data);
                if (isJsonObject && jsonObj.error) {
                    return { error: jsonObj.error };
                }
                return { data: new HyperAttr(jsonObj) };
            } catch (err) {
                return { error: 'Invalid JSON response' };
            }
        }
        return { error: 'Invalid response format' };
    }

    _httpsGet(url, params) {
        return new Promise((resolve, reject) => {
            const request = https.get(url + '?' + params, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    resolve(data);
                });
            });
            request.on('error', (err) => {
                reject(err);
            });
        });
    }

    async chatbot(prompt, model) {
        if (!model || !this.chatModels.includes(model) || !prompt) {
            return this._response({
                error: 'Invalid input'
            });
        }
        try {
            const url = this.baseApi.replace('{}', 'chat');
            const params = new URLSearchParams({
                model: model,
                prompt: prompt,
            });
            const response = await this._httpsGet(url, params);
            return this._response(response);
        } catch (error) {
            return this._response({
                error: 'An error occurred'
            });
        }
    }

    async generateImage(prompt, model) {
        if (!model || !this.imgModels.includes(model) || !prompt) {
            return this._response({
                error: 'Invalid input'
            });
        }
        try {
            const url = this.baseApi.replace('{}', 'image');
            const params = new URLSearchParams({
                model: model,
                prompt: prompt,
            });
            const response = await this._httpsGet(url, params);
            return this._response(response);
        } catch (error) {
            return this._response({
                error: 'An error occurred'
            });
        }
    }
}

const app = express();
const port = 3000;

const hyper = new HyperGPT();
hyper.baseApi = 'https://api.biswax.dev/{}';

app.get('/chat', async (req, res) => {
    const prompt = req.query.prompt;
    const model = req.query.model;
    const chatResponse = await hyper.chatbot(prompt, model);
    res.setHeader('Content-Type', 'application/json');
    res.send(chatResponse);
});

app.get('/dalle', async (req, res) => {
    const prompt = req.query.prompt;
    const model = req.query.model;
    const imageResponse = await hyper.generateImage(prompt, model);
    res.setHeader('Content-Type', 'application/json');
    res.send(imageResponse);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
