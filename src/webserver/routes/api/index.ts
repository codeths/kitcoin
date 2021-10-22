import express from 'express';
const router = express.Router();

import currency from './currency';
import classroom from './classroom';
import users from './users';
import misc from './misc';

router.use(currency);
router.use(classroom);
router.use(users);
router.use(misc);

router.use((req, res) => res.status(404).send());

export default router;
