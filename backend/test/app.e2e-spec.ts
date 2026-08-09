import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('SEAVAIG Backend Enterprise End-to-End System Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/login (POST) - Login with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@seavaig.com', password: 'password123' });

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('accessToken');
  });

  it('/api/farmers (GET) - Fetch multi-tenant farmers list', async () => {
    const response = await request(app.getHttpServer()).get('/api/farmers');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('/api/purchases (GET) - Fetch purchases portal data', async () => {
    const response = await request(app.getHttpServer()).get('/api/purchases');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('/api/payments (GET) - Fetch payments ledger', async () => {
    const response = await request(app.getHttpServer()).get('/api/payments');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('/api/tenants (GET) - Fetch active SaaS client tenants', async () => {
    const response = await request(app.getHttpServer()).get('/api/tenants');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
