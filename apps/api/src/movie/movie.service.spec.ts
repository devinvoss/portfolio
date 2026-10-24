import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MovieService } from './movie.service';

describe('MovieService', () => {
  let service: MovieService;
  const movieModel = { aggregate: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovieService, { provide: getModelToken('Movie'), useValue: movieModel }],
    }).compile();

    service = module.get<MovieService>(MovieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should count movies per genre, most popular first', async () => {
    const genreCounts = [{ genre: 'Drama', count: 3 }, { genre: 'Action', count: 1 }];
    movieModel.aggregate.mockReturnValue({ exec: () => Promise.resolve(genreCounts) });

    await expect(service.getGenreCounts()).resolves.toEqual(genreCounts);
    expect(movieModel.aggregate).toHaveBeenCalledWith([
      { $match: {} },
      { $unwind: '$genre' },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, genre: '$_id', count: 1 } }
    ]);
  });

  it('should apply every filter except genre when counting genres', async () => {
    movieModel.aggregate.mockReturnValue({ exec: () => Promise.resolve([]) });

    await service.getGenreCounts({ title: 'alien', person: '', genre: ['Horror'], rating: [5] });

    const [match] = movieModel.aggregate.mock.calls.at(-1)[0];
    expect(match.$match).toEqual({ title: { $regex: /alien/i }, rating: { $in: [5] } });
  });
});
