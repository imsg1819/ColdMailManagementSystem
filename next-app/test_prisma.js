require('dotenv').config();
const { PrismaClient } = require('./node_modules/.prisma/client');
try {
    const prisma = new PrismaClient();
    console.log("Prisma instance created successfully:", !!prisma.recipient);
} catch (e) {
    console.error("Prisma Initialization Error:", e.message);
}
