export function isNullOrUndefined(object: any): boolean {
  if (object === null || object === undefined) {
    return true;
  } else {
    return false;
  }
}

export function isUndefined(object: any): boolean {
  if (object === undefined) {
    return true;
  } else {
    return false;
  }
}
