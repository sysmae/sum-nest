import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  // 각 테스트 전에 실행: 새로운 애플리케이션 인스턴스 생성
  // 이를 통해 테스트 간 격리를 보장하고 일관된 테스트 환경 제공
  beforeEach(async () => {
    // 테스트 모듈 생성 - AppModule을 가져와서 전체 애플리케이션 컨텍스트 구성
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // NestJS 애플리케이션 인스턴스 생성
    app = moduleFixture.createNestApplication();

    // 전역 파이프 설정: 입력 데이터 유효성 검증 및 변환
    // whitelist: DTO에 정의되지 않은 속성 제거
    // forbidNonWhitelisted: 정의되지 않은 속성이 있으면 에러 발생
    // transform: 타입 변환 자동 수행 (예: 문자열 -> 숫자)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  // 각 테스트 후에 실행: 애플리케이션 인스턴스 정리
  // 메모리 누수 방지 및 다음 테스트를 위한 깨끗한 환경 조성
  afterEach(async () => {
    await app.close();
  });

  describe('Root', () => {
    // 기본 루트 경로 테스트: 애플리케이션의 기본 동작 확인
    it('/ (GET) - 홈페이지 접근', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200) // HTTP 상태 코드 200 확인
        .expect('Welcome to my Movie API!'); // 응답 메시지 확인
    });
  });

  describe('Movies - Collection Endpoints', () => {
    // 각 컬렉션 테스트 전에 실행: 일관된 테스트 데이터 생성
    // beforeEach를 통해 매번 같은 상태에서 테스트 시작을 보장
    beforeEach(async () => {
      // 테스트용 영화 데이터 2개 생성
      // 첫 번째 영화: 액션/드라마 장르
      await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'Test Movie 1',
          year: 2021,
          genres: ['Action', 'Drama'],
        });

      // 두 번째 영화: 코미디 장르
      await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'Test Movie 2',
          year: 2022,
          genres: ['Comedy'],
        });
    });

    describe('GET /movies', () => {
      // 영화 목록 조회 테스트: beforeEach에서 생성한 2개 영화 데이터 확인
      it('모든 영화 목록 조회', () => {
        return request(app.getHttpServer())
          .get('/movies')
          .expect(200) // 성공 응답 확인
          .expect((res) => {
            expect(res.body).toBeInstanceOf(Array); // 배열 타입 확인
            expect(res.body).toHaveLength(2); // beforeEach에서 생성한 2개 영화 확인
            expect(res.body[0]).toHaveProperty('id'); // 첫 번째 영화 ID 존재 확인
            expect(res.body[0]).toHaveProperty('title'); // 첫 번째 영화 제목 존재 확인
            expect(res.body[0]).toHaveProperty('year'); // 첫 번째 영화 연도 존재 확인
          });
      });

      // 빈 상태에서의 목록 조회 테스트: 새로운 앱 인스턴스로 초기 상태 시뮬레이션
      it('빈 배열에서 모든 영화 조회 (초기 상태)', async () => {
        // 새로운 앱 인스턴스로 테스트 (데이터 없는 상태)
        const freshModuleFixture = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();
        const freshApp = freshModuleFixture.createNestApplication();
        freshApp.useGlobalPipes(
          new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
          }),
        );
        await freshApp.init();

        const response = await request(freshApp.getHttpServer())
          .get('/movies')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toHaveLength(0); // 초기 상태에서는 빈 배열

        await freshApp.close(); // 메모리 누수 방지를 위한 앱 종료
      });
    });

    describe('POST /movies', () => {
      // 영화 생성 성공 케이스: 필수 필드만 포함
      it('새로운 영화 생성 - 필수 필드만', () => {
        return request(app.getHttpServer())
          .post('/movies')
          .send({ title: 'New Movie', year: 2023 }) // 필수 필드인 title, year만 전송
          .expect(201) // 생성 성공 응답 확인
          .expect((res) => {
            expect(res.body).toHaveProperty('id'); // 자동 생성된 ID 확인
            expect(res.body.title).toBe('New Movie'); // 전송한 제목 확인
            expect(res.body.year).toBe(2023); // 전송한 연도 확인
          });
      });

      // 영화 생성 성공 케이스: 모든 필드 포함
      it('새로운 영화 생성 - 모든 필드 포함', () => {
        return request(app.getHttpServer())
          .post('/movies')
          .send({
            title: 'Complete Movie',
            year: 2023,
            genres: ['Action', 'Adventure', 'Sci-Fi'], // 선택 필드인 장르도 포함
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Complete Movie');
            expect(res.body.year).toBe(2023);
            expect(res.body.genres).toEqual(['Action', 'Adventure', 'Sci-Fi']); // 장르 배열 확인
          });
      });

      // 유효성 검증 실패 케이스: 제목 누락
      it('잘못된 데이터로 영화 생성 시도 - 제목 누락', () => {
        return request(app.getHttpServer())
          .post('/movies')
          .send({ year: 2023 }) // title 필드 누락
          .expect(400); // ValidationPipe에 의한 Bad Request 응답
      });

      // 유효성 검증 실패 케이스: 연도 누락
      it('잘못된 데이터로 영화 생성 시도 - 연도 누락', () => {
        return request(app.getHttpServer())
          .post('/movies')
          .send({ title: 'Movie Without Year' }) // year 필드 누락
          .expect(400);
      });

      // 유효성 검증 실패 케이스: 잘못된 데이터 타입
      it('잘못된 데이터 타입으로 영화 생성 시도', () => {
        return request(app.getHttpServer())
          .post('/movies')
          .send({ title: 123, year: 'not-a-number' }) // 타입 불일치
          .expect(400);
      });
    });

    describe('DELETE /movies (잘못된 엔드포인트)', () => {
      // 존재하지 않는 엔드포인트 테스트: 컬렉션 전체 삭제는 지원하지 않음
      it('존재하지 않는 엔드포인트 호출', () => {
        return request(app.getHttpServer()).delete('/movies').expect(404);
      });
    });
  });

  describe('Movies - Individual Movie Endpoints', () => {
    let createdMovieId: number;

    // 개별 영화 테스트를 위한 데이터 준비
    // 각 테스트 전에 특정 영화를 생성하여 ID를 얻음
    beforeEach(async () => {
      // 테스트용 메인 영화 생성
      const response = await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'Test Movie for Individual Tests',
          year: 2023,
          genres: ['Test Genre'],
        });
      createdMovieId = response.body.id; // 생성된 영화의 ID 저장

      // 추가 테스트 데이터 (다른 테스트에서 사용될 수 있음)
      await request(app.getHttpServer())
        .post('/movies')
        .send({ title: 'Another Test Movie', year: 2022 });
    });

    describe('GET /movies/:id', () => {
      // 특정 영화 조회 성공 케이스: beforeEach에서 생성한 영화 조회
      it('특정 영화 조회 - 성공', () => {
        return request(app.getHttpServer())
          .get(`/movies/${createdMovieId}`) // 생성된 영화의 ID로 조회
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', createdMovieId); // ID 일치 확인
            expect(res.body).toHaveProperty(
              'title',
              'Test Movie for Individual Tests', // 생성 시 설정한 제목 확인
            );
            expect(res.body).toHaveProperty('year', 2023); // 생성 시 설정한 연도 확인
            expect(res.body).toHaveProperty('genres'); // 장르 필드 존재 확인
          });
      });

      // 존재하지 않는 영화 조회 실패 케이스
      it('존재하지 않는 영화 조회', () => {
        return request(app.getHttpServer())
          .get('/movies/999') // 존재하지 않는 ID로 조회
          .expect(404) // Not Found 응답
          .expect((res) => {
            expect(res.body.message).toContain('Movie with ID 999 not found'); // 에러 메시지 확인
          });
      });

      // 잘못된 ID 형식으로 조회 실패 케이스
      it('잘못된 ID 형식으로 영화 조회', () => {
        return request(app.getHttpServer())
          .get('/movies/invalid-id') // 숫자가 아닌 ID로 조회
          .expect(400); // ParseIntPipe에 의한 Bad Request 응답
      });
    });

    describe('PATCH /movies/:id', () => {
      // 부분 업데이트 테스트: 제목만 변경, 다른 필드는 유지
      it('영화 부분 업데이트 - 제목만', () => {
        return request(app.getHttpServer())
          .patch(`/movies/${createdMovieId}`)
          .send({ title: 'Updated Title' }) // 제목만 변경
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdMovieId); // ID는 변경되지 않음
            expect(res.body.title).toBe('Updated Title'); // 제목은 변경됨
            expect(res.body.year).toBe(2023); // 기존 값 유지
          });
      });

      // 부분 업데이트 테스트: 연도만 변경
      it('영화 부분 업데이트 - 연도만', () => {
        return request(app.getHttpServer())
          .patch(`/movies/${createdMovieId}`)
          .send({ year: 2024 }) // 연도만 변경
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdMovieId);
            expect(res.body.title).toBe('Test Movie for Individual Tests'); // 기존 값 유지
            expect(res.body.year).toBe(2024); // 연도는 변경됨
          });
      });

      // 부분 업데이트 테스트: 장르만 변경
      it('영화 부분 업데이트 - 장르만', () => {
        return request(app.getHttpServer())
          .patch(`/movies/${createdMovieId}`)
          .send({ genres: ['Updated Genre', 'Another Genre'] }) // 장르만 변경
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdMovieId);
            expect(res.body.genres).toEqual(['Updated Genre', 'Another Genre']); // 장르는 변경됨
          });
      });

      // 존재하지 않는 영화 업데이트 실패 케이스
      it('존재하지 않는 영화 업데이트', () => {
        return request(app.getHttpServer())
          .patch('/movies/999') // 존재하지 않는 ID
          .send({ title: 'Updated Title' })
          .expect(404); // Not Found 응답
      });

      // 잘못된 데이터로 업데이트 실패 케이스
      it('잘못된 데이터로 영화 업데이트', () => {
        return request(app.getHttpServer())
          .patch(`/movies/${createdMovieId}`)
          .send({ year: 'invalid-year' }) // 잘못된 데이터 타입
          .expect(400); // ValidationPipe에 의한 Bad Request
      });
    });

    describe('PUT /movies/:id', () => {
      // 전체 업데이트 테스트: 모든 필드를 새로운 값으로 대체
      it('영화 전체 업데이트', () => {
        return request(app.getHttpServer())
          .put(`/movies/${createdMovieId}`)
          .send({
            title: 'Completely Updated Movie',
            year: 2025,
            genres: ['New Genre'], // 모든 필드를 새로운 값으로 설정
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(createdMovieId); // ID는 유지
            expect(res.body.title).toBe('Completely Updated Movie'); // 모든 필드가 새로운 값으로 변경
            expect(res.body.year).toBe(2025);
            expect(res.body.genres).toEqual(['New Genre']);
          });
      });

      // 존재하지 않는 영화 전체 업데이트 실패 케이스
      it('존재하지 않는 영화 전체 업데이트', () => {
        return request(app.getHttpServer())
          .put('/movies/999') // 존재하지 않는 ID
          .send({ title: 'Updated Title', year: 2023 })
          .expect(404); // Not Found 응답
      });
    });

    describe('DELETE /movies/:id', () => {
      // 영화 삭제 성공 케이스
      it('영화 삭제 - 성공', () => {
        return request(app.getHttpServer())
          .delete(`/movies/${createdMovieId}`) // 생성된 영화 삭제
          .expect(200); // 성공 응답 확인
      });

      // 삭제 후 조회 실패 확인: 삭제된 영화는 더 이상 조회되지 않음
      it('삭제된 영화 조회 확인', async () => {
        await request(app.getHttpServer())
          .delete(`/movies/${createdMovieId}`)
          .expect(200); // 먼저 영화 삭제

        return request(app.getHttpServer())
          .get(`/movies/${createdMovieId}`) // 삭제된 영화 조회 시도
          .expect(404); // Not Found 응답 확인
      });

      // 존재하지 않는 영화 삭제 실패 케이스
      it('존재하지 않는 영화 삭제', () => {
        return request(app.getHttpServer()).delete('/movies/999').expect(404);
      });

      // 잘못된 ID 형식으로 삭제 실패 케이스
      it('잘못된 ID로 영화 삭제', () => {
        return request(app.getHttpServer())
          .delete('/movies/invalid-id') // 숫자가 아닌 ID
          .expect(400); // ParseIntPipe에 의한 Bad Request
      });
    });
  });

  describe('Movies - Integration Tests', () => {
    // 전체 CRUD 플로우 통합 테스트: 생성→조회→수정→재조회→삭제→삭제확인
    it('전체 CRUD 플로우 테스트', async () => {
      // 1. 영화 생성 (Create)
      const createResponse = await request(app.getHttpServer())
        .post('/movies')
        .send({ title: 'Integration Test Movie', year: 2023, genres: ['Test'] })
        .expect(201);

      const movieId = createResponse.body.id; // 생성된 영화 ID 저장
      expect(createResponse.body.title).toBe('Integration Test Movie'); // 생성 확인

      // 2. 생성된 영화 조회 (Read)
      await request(app.getHttpServer())
        .get(`/movies/${movieId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Integration Test Movie'); // 생성한 영화가 조회됨
        });

      // 3. 영화 업데이트 (Update)
      await request(app.getHttpServer())
        .patch(`/movies/${movieId}`)
        .send({ title: 'Updated Integration Movie' })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Integration Movie'); // 업데이트 확인
        });

      // 4. 업데이트 확인을 위한 재조회
      await request(app.getHttpServer())
        .get(`/movies/${movieId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Integration Movie'); // 업데이트가 반영됨
        });

      // 5. 영화 삭제 (Delete)
      await request(app.getHttpServer())
        .delete(`/movies/${movieId}`)
        .expect(200);

      // 6. 삭제 확인: 삭제된 영화는 더 이상 조회되지 않음
      await request(app.getHttpServer()).get(`/movies/${movieId}`).expect(404);
    });

    // 다중 영화 데이터 처리 테스트: 여러 영화 생성 후 목록 조회
    it('다중 영화 생성 및 목록 조회', async () => {
      const movies = [
        { title: 'Movie 1', year: 2021, genres: ['Action'] },
        { title: 'Movie 2', year: 2022, genres: ['Comedy'] },
        { title: 'Movie 3', year: 2023, genres: ['Drama'] },
      ];

      // 다중 영화 생성: 순차적으로 영화 데이터 생성
      const createdMovies: any[] = [];
      for (const movie of movies) {
        const response = await request(app.getHttpServer())
          .post('/movies')
          .send(movie)
          .expect(201);
        createdMovies.push(response.body); // 생성된 영화 정보 저장
      }

      // 전체 목록 조회 및 검증: 생성한 모든 영화가 목록에 포함되는지 확인
      const listResponse = await request(app.getHttpServer())
        .get('/movies')
        .expect(200);

      expect(listResponse.body).toHaveLength(3); // 3개 영화 생성 확인
      expect(listResponse.body.map((m: any) => m.title)).toEqual(
        expect.arrayContaining(['Movie 1', 'Movie 2', 'Movie 3']), // 생성한 영화들이 모두 포함됨
      );
    });
  });

  describe('Error Handling', () => {
    // 라우팅 오류 테스트: 정의되지 않은 경로 접근
    it('존재하지 않는 경로 접근', () => {
      return request(app.getHttpServer()).get('/non-existent-path').expect(404);
    });

    // HTTP 메소드 오류 테스트: 지원하지 않는 메소드로 요청
    it('잘못된 HTTP 메소드', () => {
      return request(app.getHttpServer()).put('/').expect(404); // 루트 경로는 PUT을 지원하지 않음
    });

    // 요청 형식 오류 테스트: Content-Type 헤더 없이 POST 요청
    it('Content-Type 헤더 없이 POST 요청', () => {
      return request(app.getHttpServer()).post('/movies').expect(400); // 요청 바디가 없으면 ValidationPipe가 400 에러 발생
    });
  });
});
