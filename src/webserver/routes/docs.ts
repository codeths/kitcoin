import express from 'express';
const router = express.Router();

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
const swaggerDocument = YAML.load(`${__dirname}/api/api.yaml`);

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
