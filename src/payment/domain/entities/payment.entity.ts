export type PaymentProps = {
  name: string;
};

export class Payment {
  private constructor(
    public readonly id: string,
    private props: PaymentProps,
    private readonly _createdAt: Date,
  ) {}

  static create(props: PaymentProps): Payment {
    return new Payment(crypto.randomUUID(), props, new Date());
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  update(props: Partial<PaymentProps>): void {
    this.props = { ...this.props, ...props };
  }

  toJSON(): PaymentProps & { id: string; createdAt: Date } {
    return { ...this.props, id: this.id, createdAt: this._createdAt };
  }
}
