import { Category } from './category';

export interface Filter {
  category: Category;
  filtered: boolean;
}
