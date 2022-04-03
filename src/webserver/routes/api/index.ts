import express from 'express';

import classroom from './classroom.js';
import currency from './currency.js';
import misc from './misc.js';
import reports from './reports.js';
import store from './store.js';
import users from './users.js';

const router = express.Router();

router.use(currency);
router.use(classroom);
router.use(misc);
router.use('/reports', reports);
router.use('/store', store);
router.use('/users', users);

router.use((req, res) => res.status(404).send());

export default router;
