import { Process, State, SyncPromise } from "./";

describe("PROCESS", () => {
  test("should create a process", () => {
    expect(new Process());
  });
  test("should run callback in THEN", () => {
    const cb = jest.fn();
    const process = new Process<string>().then(cb);
    process.start();
    expect(cb).toHaveBeenCalled();
  });
  test("should chain process", () => {
    const cb = jest.fn();
    const process = new Process().then(cb).then(cb);
    return process.start().then(() => {
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });
  test("should pass returned value", () => {
    const process = new Process<string>()
      .then(() => {
        return 5;
      })
      .then(val => {
        return val + 5;
      });

    return process.start().then(val => {
      expect(val).toBe(10);
    });
  });
  test("should run synchronously", () => {
    const order = [];
    const process = new Process<string>()
      .then(() => {
        order.push("A");
        return 5;
      })
      .then(val => {
        order.push("B");
        return val + 5;
      });

    const started = process.start();
    order.push("C");

    return started.then(val => {
      expect(order).toEqual(["A", "B", "C"]);
    });
  });
  test("should handle promises", () => {
    const process = new Process<string>()
      .then(() => {
        return Promise.resolve(5);
      })
      .then(val => {
        return val + 5;
      });

    return process.start().then(val => {
      expect(val).toEqual(10);
    });
  });

  test("should be able to chain processes", () => {
    let callbacks = [];
    const processA = new Process().then(() => {
      callbacks.push("A");
    });

    const processB = new Process()
      .then(_ => {
        callbacks.push("B");
      })
      .then(processA);

    return processB.start().then(() => {
      expect(callbacks).toEqual(["B", "A"]);
    });
  });
  test("should be able to stop process", () => {
    expect.assertions(2);

    const cb = jest.fn();
    const process = new Process()
      .then(() => {
        cb();
        return new Promise(resolve => setTimeout(resolve, 10));
      })
      .then(cb);

    const test = process.start().catch(reason => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(reason).toBe(State.STOPPED);
    });

    setTimeout(() => process.stop(), 0);

    return test;
  });

  test("should be able to stop process", () => {
    expect.assertions(4);

    const cb = jest.fn();
    const process = new Process()
      .then(
        (): SyncPromise<number> => {
          cb();
          return resolve => setTimeout(resolve, 10);
        }
      )
      .then(cb);

    process.start().catch(reason => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(reason).toBe(State.STOPPED);
    });

    return process.stop().then(() => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(process.state).toBe(State.IDLE);
    });
  });
  test("should be able to start a stopped process", () => {
    expect.assertions(3);

    const cb = jest.fn();
    const process = new Process()
      .then(() => {
        cb();
        return resolve => setTimeout(resolve, 10);
      })
      .then(cb);

    process.start().catch(reason => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(reason).toBe(State.STOPPED);
    });

    return Promise.resolve()
      .then(() => {
        return process.stop().catch(() => {});
      })
      .then(() => {
        return process.start();
      })
      .then(() => {
        expect(cb).toHaveBeenCalledTimes(3);
      });
  });
  test("should be bable to restart a process", () => {
    expect.assertions(3);

    const cb = jest.fn();
    const process = new Process()
      .then(() => {
        cb();
        return resolve => setTimeout(resolve, 10);
      })
      .then(cb);

    return Promise.all([
      process.start().catch(reason => {
        expect(cb).toHaveBeenCalledTimes(1);
        expect(reason).toBe(State.STOPPED);
      }),
      Promise.resolve()
        .then(() => {
          return process.restart();
        })
        .then(() => {
          expect(cb).toHaveBeenCalledTimes(3);
        })
    ]);
  });
  test("should be able to dispose a process", () => {
    expect.assertions(3);

    const cb = jest.fn();
    const process = new Process()
      .then(() => {
        cb();
        return resolve => setTimeout(resolve, 10);
      })
      .then(cb);

    return Promise.all([
      process.start().catch(reason => {
        expect(cb).toHaveBeenCalledTimes(1);
        expect(reason).toBe(State.STOPPED);
      }),
      Promise.resolve()
        .then(() => {
          return process.dispose();
        })
        .then(() => {
          return process.start();
        })
        .catch(() => {
          expect(cb).toHaveBeenCalledTimes(1);
        })
    ]);
  });
  test("should be able to merge multiple promises", () => {
    const cb = jest.fn();
    const process = new Process()
      .all([
        () => {
          cb();
          return resolve => setTimeout(resolve, 10);
        },
        cb
      ])
      .then(cb);

    return process.start().then(() => {
      expect(cb).toBeCalledTimes(3);
    });
  });

  test("should be able to merge processes", () => {
    const cb = jest.fn();
    const processB = new Process().then(() => {
      cb();
      return resolve => setTimeout(resolve, 10);
    });
    const process = new Process()
      .all([
        processB,
        cb
      ])
      .then(cb);

    return process.start().then(() => {
      expect(cb).toHaveBeenCalledTimes(3);
    });
  });
  test("should stop merged processes", () => {
    const cb = jest.fn();
    const processB = new Process()
      .then(() => {
        return resolve => setTimeout(resolve, 10);
      })
      .then(cb);
    const process = new Process()
      .all([
        processB,
        cb
      ])
      .then(cb);
    setTimeout(() => process.stop(), 0);
    return process.start().catch(reason => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(reason).toBe(State.STOPPED);
    });
  });
  test("should be able to automatically dispose", () => {
    const cb = jest.fn();
    const processB = new Process({
      dispose: true
    })
      .then(() => {
        return resolve => setTimeout(resolve, 10);
      })
      .then(cb);
    const process = new Process({
      dispose: true
    })
      .all([
        processB,
        cb
      ])
      .then(cb);
    return process.start().then(() => {
      expect(cb).toHaveBeenCalledTimes(3);
      console.log("checking disposed");
      expect(process.state).toBe(State.DISPOSED);
    });
  });
});
