export type UserProps = {
  name: string;
  email: string;
  password: string;
  preference: string;
};

export class User {
  private constructor(
    public readonly id: string,
    private props: UserProps,
    private readonly _createdAt: Date,
  ) {}

  static create(props: UserProps): User {
    return new User(crypto.randomUUID(), props, new Date());
  }

  static hydrate(props: UserProps & { id: string; createdAt: Date }): User {
    return new User(props.id, props, props.createdAt);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get preference(): string {
    return this.props.preference;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  update(props: Partial<UserProps>): void {
    this.props = { ...this.props, ...props };
  }

  toJSON(): UserProps & { id: string; createdAt: Date } {
    return { ...this.props, id: this.id, createdAt: this._createdAt };
  }
}
