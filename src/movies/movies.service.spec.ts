import { Test, TestingModule } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { NotFoundException } from '@nestjs/common';

describe('MoviesService', () => {
  let service: MoviesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoviesService],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return an array of movies', () => {
      const result = service.getAll();
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getOne', () => {
    it('should return a movie', () => {
      service.create({
        title: 'Test Movie',
        year: 2023,
        genres: ['Action', 'test'],
      });
      const movie = service.getOne(1);
      expect(movie).toBeDefined();
      expect(movie.title).toBe('Test Movie');
      expect(movie.year).toBe(2023);
      expect(movie.genres).toEqual(['Action', 'test']);
      expect(movie.id).toEqual(1);
    });
    it('should throw 404 error', () => {
      try {
        service.getOne(999);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        if (e instanceof NotFoundException) {
          expect(e.message).toBe('Movie with ID 999 not found.');
        }
      }
    });
  });

  describe('deleteOne', () => {
    it('should delete a movie', () => {
      service.create({
        title: 'Test Movie',
        year: 2023,
        genres: ['Action', 'test'],
      });
      const beforeMovies = service.getAll();
      service.deleteOne(1);
      const afterMovies = service.getAll();
      expect(afterMovies.length).toBeLessThan(beforeMovies.length);
    });

    it('should throw 404 error', () => {
      try {
        service.deleteOne(999);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        if (e instanceof NotFoundException) {
          expect(e.message).toBe('Movie with ID 999 not found.');
        }
      }
    });
  });

  describe('create', () => {
    it('should create a movie', async () => {
      // 새로운 서비스 인스턴스 생성하여 테스트 격리
      const module: TestingModule = await Test.createTestingModule({
        providers: [MoviesService],
      }).compile();
      const cleanService = module.get<MoviesService>(MoviesService);

      const beforeCount = cleanService.getAll().length;
      expect(beforeCount).toBe(0); // 시작 시 0개여야 함

      cleanService.create({
        title: 'New Movie',
        year: 2023,
        genres: ['Drama'],
      });

      const afterCount = cleanService.getAll().length;
      expect(afterCount).toBe(1); // 생성 후 1개여야 함
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });
});
