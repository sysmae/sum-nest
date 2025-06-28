import { Injectable, NotFoundException } from '@nestjs/common';
import { Movie } from './entities/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MoviesService {
  private movies: Movie[] = [];

  getAll(): Movie[] {
    return this.movies;
  }

  getOne(id: number): Movie {
    const movie = this.movies.find((movie) => movie.id === id);
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found.`);
    }
    return movie;
  }

  deleteOne(id: number): void {
    this.getOne(id); // 존재 여부 확인
    this.movies = this.movies.filter((movie) => movie.id !== id);
  }

  create(movieData: CreateMovieDto): Movie {
    const newMovie = new Movie();
    Object.assign(newMovie, {
      ...movieData,
      id: this.movies.length + 1, // 간단한 ID 생성 로직
    });
    this.movies.push(newMovie);
    return newMovie;
  }

  update(id: number, updateData: UpdateMovieDto): Movie {
    const movie = this.getOne(id);
    this.deleteOne(id); // 기존 영화 삭제
    const updatedMovie = new Movie();
    Object.assign(updatedMovie, movie, updateData);
    this.movies.push(updatedMovie); // 업데이트된 영화 추가
    return updatedMovie;
  }
}
