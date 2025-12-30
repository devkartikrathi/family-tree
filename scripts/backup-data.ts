
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function backup() {
    console.log('Starting backup...');

    try {
        const families = await prisma.family.findMany({
            include: {
                nodes: true,
                edges: true
            }
        });

        const backupData = {
            timestamp: new Date().toISOString(),
            families
        };

        const backupPath = path.join(process.cwd(), 'backup.json');
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

        console.log(`Backup completed successfully! Saved ${families.length} families to ${backupPath}`);
    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
