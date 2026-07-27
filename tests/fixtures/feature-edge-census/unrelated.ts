const unrelated = {
  query(...names: string[]): readonly string[] {
    return names;
  },
  spawn(value: object): object {
    return value;
  },
};

unrelated.query('NotAnEcsComponent');
unrelated.spawn({ AlsoNotAComponent: true });
