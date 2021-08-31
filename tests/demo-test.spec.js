const loadedData = require('../data-load.json');
const SwaggerPetStore = require('swagger_petstore');

describe('demo test', () => {
  let petApi;
  beforeAll(() => {
    const apiClient = SwaggerPetStore.ApiClient.instance;
  
    apiClient.basePath = 'https://petstore3.swagger.io/api/v3';

    petApi = new SwaggerPetStore.PetApi(apiClient);
  });

  describe('when getting a pet', () => {
    let getResponse;

    beforeAll(async () => {
      const getPet = (callback) => petApi.getPetById(loadedData.pet.firulais.id, callback);

      try {
        getResponse = await retry(getPet);
      } catch(e) {
        console.log(e);
      }
    });

    it('and the pet should not exist', () => {
      expect(getResponse.statusCode).toBe(200);
    });
  });
});


async function retry(fn) {
  let response;
  const maxRetries = 5;
  let retryCount = 0;

  while (response?.statusCode === undefined && retryCount < maxRetries) {
    response = await trySafe(fn);
    await sleep();
    retryCount++;
  }

  return response;
}

async function sleep() {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

async function trySafe(fn) {
  let response;

  try {
    response = await promisify(fn);
  } catch (e) {
    response = e;
  }

  return response;
}

function promisify(fn) {
  return new Promise((resolve, reject) => fn((error, data, response) => {
    if (error) {
      reject(error)
    }

    resolve(response);
  }));
}
