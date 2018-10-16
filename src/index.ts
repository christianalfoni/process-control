export type Options = {
  dispose: boolean;
};

export type Next<Output> = (err: State, val?: Output) => void;

export type SyncPromise<T = any> = (
  resolve: (val: T) => void,
  reject: (val: any) => void
) => void;

export type Callback<Input, Output> = (
  val: Input
) => Output | Promise<Output> | SyncPromise<Output>;

export type Runner<Input, Output> =
  | Callback<Input, Output>
  | Process<Input, Output>;

export enum State {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  DISPOSED = "DISPOSED"
}

export class Process<InitialInput = any, ThisInput = InitialInput> {
  private _options: Options;
  private _parent: Process<any, any>;
  private _child: Process<any, any>;
  private _run: Runner<any, any> | Runner<any, any>[];
  private _currentRun: Promise<ThisInput>;
  state: State = State.IDLE;
  constructor(
    options: Options = { dispose: false },
    parent?: Process<any, any>
  ) {
    this._options = options;
    this._parent = parent;
  }
  private run<T>(newValue: T, next: Next<ThisInput | T>) {
    return (this._currentRun = new Promise((resolve, reject) => {
      const proceed = (err, value) => {
        if (err) {
          reject(err);
          next(err);
          return;
        }

        if (this.state === State.STOPPED) {
          reject(State.STOPPED);
          next(State.STOPPED);
          return;
        }

        let returnedValue;
        if (!this._run) {
          returnedValue = value;
        } else if (Array.isArray(this._run)) {
          const allRunner = this._run;
          returnedValue = (resolveAll, rejectAll) => {
            let resolvedCount = 0;
            let rejectedCount = 0;
            const checkResolvement = () => {
              if (resolvedCount + rejectedCount === allRunner.length) {
                if (rejectedCount) {
                  rejectAll();
                } else {
                  resolveAll();
                }
              }
            };
            const addResolved = () => {
              resolvedCount++;
              checkResolvement();
            };
            const addRejected = () => {
              rejectedCount++;
              checkResolvement();
            };

            allRunner.forEach(runner => {
              if (runner instanceof Process) {
                runner
                  .start(newValue)
                  .then(addResolved)
                  .catch(addRejected);
              } else {
                const runnerResult = runner(value);

                if (runnerResult instanceof Promise) {
                  runnerResult.then(addResolved).catch(addRejected);
                } else if (typeof runnerResult === "function") {
                  runnerResult(addResolved, addRejected);
                } else {
                  addResolved();
                }
              }
            });
          };
        } else if (this._run instanceof Process) {
          returnedValue = this._run.start(newValue);
        } else {
          returnedValue = this._run(value);
        }

        if (returnedValue instanceof Promise) {
          returnedValue
            .then(val => {
              if (this.state === State.STOPPED) {
                reject(State.STOPPED);
                next(State.STOPPED);
                return;
              }

              resolve(val);
              next(null, val);
            })
            .catch(next);
        } else if (typeof returnedValue === "function") {
          returnedValue(
            resolvedValue => {
              if (this.state === State.STOPPED) {
                reject(State.STOPPED);
                next(State.STOPPED);
                return;
              }

              resolve(resolvedValue);
              next(null, resolvedValue);
            },
            rejectedValue => {
              if (this.state === State.STOPPED) {
                reject(State.STOPPED);
                next(State.STOPPED);
                return;
              }

              reject(rejectedValue);
              next(rejectedValue);
            }
          );
        } else {
          resolve(returnedValue);
          next(null, returnedValue);
        }
      };

      if (this._parent) {
        this._parent.run(newValue, proceed).catch(reject);
      } else {
        proceed(null, newValue);
      }
    }));
  }
  then<T>(runner: Runner<ThisInput, T>): Process<InitialInput, T> {
    this._run = runner;

    return (this._child = new Process<InitialInput, T>(this._options, this));
  }
  all(runners: Runner<ThisInput, any>[]): Process<InitialInput, ThisInput> {
    this._run = runners;

    return (this._child = new Process<InitialInput, ThisInput>(
      this._options,
      this
    ));
  }
  start(initialValue?: InitialInput): Promise<ThisInput>;
  start(initialValue?): Promise<ThisInput> {
    if (this.state === State.DISPOSED) {
      return Promise.reject(State.DISPOSED);
    }

    this.state === State.RUNNING;

    return this.run(initialValue, () => {
      if (this._options.dispose) {
        this.state = State.DISPOSED;
      } else {
        this.state = State.IDLE;
      }
    });
  }
  stop() {
    this.state = State.STOPPED;

    let stop: Promise<any> = Promise.resolve();

    if (this._parent) {
      stop = this._parent.stop();
    }

    if (this._run instanceof Process) {
      const runner = this._run;

      stop = stop.then(() => runner.stop());
    } else if (Array.isArray(this._run)) {
      const runners = this._run;
      stop = stop.then(() =>
        Promise.all(
          runners.map(runner => {
            if (runner instanceof Process) {
              return runner.stop();
            }
          })
        )
      );
    }

    return this._currentRun
      ? this._currentRun
          .then(() => stop)
          .then(() => {
            this.state = State.IDLE;
          })
          .catch(() => {
            this.state = State.IDLE;
          })
      : stop
          .then(() => {
            this.state = State.IDLE;
          })
          .catch(() => {
            this.state = State.IDLE;
          });
  }
  restart(initialValue?: InitialInput): Promise<ThisInput>;
  restart(initialValue?): Promise<ThisInput> {
    return this._parent
      .stop()
      .then(() => this.start(initialValue))
      .catch(() => this.start(initialValue));
  }
  dispose() {
    if (this.state === State.DISPOSED) {
      Promise.resolve();
    }

    return this.stop()
      .then(() => {
        this.state = State.DISPOSED;
      })
      .catch(() => {
        this.state = State.DISPOSED;
      });
  }
}
