import express from 'express';

import classroom from './classroom';
import currency from './currency';
import misc from './misc';
import store from './store';
import users from './users';

const router = express.Router();

router.use(currency);
router.use(classroom);
router.use(users);
router.use(misc);
router.use(store);

router.use((req, res) => res.status(404).send());

export default router;
