import { Injectable } from '@angular/core';
import { Category } from '../interfaces/category';
import { ConfigService } from '../services/config';
import { Filter } from '../interfaces/filter';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class FiltersService {

  private _filters: Array<Filter> = new Array<Filter>();

  private readonly filtersChangedSource: Subject<Array<Filter>> = new BehaviorSubject<Array<Filter>>(this._filters);
  public readonly filtersChanged$: Observable<Array<Filter>> = this.filtersChangedSource.asObservable();

  public get filters(): Array<Filter> {
    return this._filters;
  }

  public set filters(filters: Array<Filter>) {
    this._filters = filters;
    this.filtersChangedSource.next(this._filters);
  }

  constructor(
    private config: ConfigService
  ) {

    // ------ Initialise filters & categories ------

    this.config.categoriesChanged$.subscribe((categories: Array<Category>) => {
      categories.forEach((category: Category) => {
        const filter: Filter = {
          category,
          filtered: false
        };
        this._filters.push(filter);
      });

      // Push updates through to filter service listeners
      this.filtersChangedSource.next(this._filters);
    });
  }

  public isFiltered(categoryId: number): boolean {
    const f = this._filters.find(t => categoryId === t.category.categoryId);
    return f ? f.filtered : false;
  }
}
