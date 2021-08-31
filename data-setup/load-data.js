const fs = require('fs');
const yaml = require('js-yaml');
const files = fs.readdirSync('./data-config');
const definition = require('../api-definition/swagger.json');
const SwaggerPetStore = require('swagger_petstore');

const allData = {};

function addRefValues(references, data) {
  const dataCopy = { ...data };
  const allReferences = {};

  for (const reference of references) {
    const pointerValue = data[reference];

    allReferences[`${reference}Id`] = allData[reference][pointerValue].id

    delete dataCopy[reference]
  }

  return { ...allReferences, ...dataCopy };
}

function determineModelOrder(files) {
  const order = [];
  for (const file of files) {
    if (!order.find(({ file: orderFile }) => orderFile === file)) {
      order.push({ file, refs: [] });
    }

    const modelKeys = Object.keys(readYamlContent(file).data[0]);
    const foundReferences = findModelReferences(modelKeys, files);

    order.find(({ file: orderFile }) => orderFile === file).refs.push(...foundReferences);
    
    foundReferences.forEach((reference) => order.unshift({ file: `${reference}.yaml`, refs: [] }));
  }

  console.log(order);

  return order;
}

function findModelReferences(modelKeys, files) {
  const modelNames = files.map((file) => file.split('.yaml')[0]);

  return modelKeys.filter((key) => modelNames.includes(key));
}

function promisify(fn) {
  return new Promise((resolve, reject) => fn((error, data, response) => {
    if (error) {
      reject(error)
    }

    resolve(response.body);
  }));
}

function readYamlContent(filePath) {
  try {
    const f = fs.readFileSync(`./data-config/${filePath}`, 'utf8');
    const doc = yaml.load(f);
    return doc;
  } catch(e) {
    console.log(e);
  }
}

function writeToFile() {
  fs.writeFileSync('data-load.json', JSON.stringify(allData));
}

async function loadData() {
  const apiClient = SwaggerPetStore.ApiClient.instance;

  apiClient.basePath = 'https://petstore.swagger.io/v2';

  const sortedFiles = determineModelOrder(files);

  for (let i = 0; i < sortedFiles.length; i++) {
    const modelContent = readYamlContent(sortedFiles[i].file);
    const { apiName, apiPath, groupingKey, data } = modelContent;
    const modelDefinition = definition.paths[apiPath];
    const modelApi = new SwaggerPetStore[`${apiName}Api`](apiClient);
    const createAction = modelDefinition?.post.operationId;

    allData[apiName.toLowerCase()] = {};
    for (let j = 0; j < data.length; j++) {
      const currentData = data[j];
      const apiCallFn = (callback) => modelApi[createAction](currentData, callback);
      addRefValues(sortedFiles[i].refs, currentData);
  
      const response = await promisify(apiCallFn);
  
      allData[apiName.toLowerCase()][response[groupingKey]] = response;
    }
  }

  writeToFile()

  return allData;
}

module.exports = loadData;
