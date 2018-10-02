import { Process, State, SyncPromise } from "./";

describe("PROCESS", () => {
  test("should create a process", () => {
    expect(new Process());
  });
  test("should run callback in THEN", () => {
    let hasRunCallback;
    const process = new Process<string>().then(() => {
      hasRunCallback = true;
    });
    process.start();
    expect(hasRunCallback);
  });
  test("should chain process", () => {
    let callbackCount = 0;
    const process = new Process()
      .then(() => {
        callbackCount++;
      })
      .then(() => {
        callbackCount++;
      });

    return process.start().then(() => {
      expect(callbackCount).toBe(2);
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

    let callbackCount = 0;
    const process = new Process()
      .then(() => {
        callbackCount++;
        return new Promise(resolve => setTimeout(resolve, 10));
      })
      .then(() => {
        callbackCount++;
      });

    const test = process.start().catch(reason => {
      expect(callbackCount).toBe(1);
      expect(reason).toBe(State.STOPPED);
    });

    setTimeout(() => process.stop(), 0);

    return test;
  });

  test("should be able to stop process", () => {
    expect.assertions(4);

    let callbackCount = 0;
    const process = new Process()
      .then(
        (): SyncPromise<number> => {
          callbackCount++;
          return resolve => setTimeout(resolve, 10);
        }
      )
      .then(() => {
        callbackCount++;
      });

    process.start().catch(reason => {
      expect(callbackCount).toBe(1);
      expect(reason).toBe(State.STOPPED);
    });

    return process.stop().then(() => {
      expect(callbackCount).toBe(1);
      expect(process.state).toBe(State.IDLE);
    });
  });
  test("should be able to start a stopped process", () => {
    expect.assertions(3);

    let callbackCount = 0;
    const process = new Process()
      .then(() => {
        callbackCount++;
        return resolve => setTimeout(resolve, 10);
      })
      .then(() => {
        callbackCount++;
      });

    process.start().catch(reason => {
      expect(callbackCount).toBe(1);
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
        expect(callbackCount).toBe(3);
      });
  });
  test("should be bable to restart a process", () => {
    expect.assertions(3);

    let callbackCount = 0;
    const process = new Process()
      .then(() => {
        callbackCount++;
        return resolve => setTimeout(resolve, 10);
      })
      .then(() => {
        callbackCount++;
      });

    return Promise.all([
      process.start().catch(reason => {
        expect(callbackCount).toBe(1);
        expect(reason).toBe(State.STOPPED);
      }),
      Promise.resolve()
        .then(() => {
          return process.restart();
        })
        .then(() => {
          expect(callbackCount).toBe(3);
        })
    ]);
  });
  test("should be able to dispose a process", () => {
    expect.assertions(3);

    let callbackCount = 0;
    const process = new Process()
      .then(() => {
        callbackCount++;
        return resolve => setTimeout(resolve, 10);
      })
      .then(() => {
        callbackCount++;
      });

    return Promise.all([
      process.start().catch(reason => {
        expect(callbackCount).toBe(1);
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
          expect(callbackCount).toBe(1);
        })
    ]);
  });
  test("should be able to merge multiple promises", () => {
    let callbackCount = 0;
    const process = new Process()
      .all([
        () => {
          callbackCount++;
          return resolve => setTimeout(resolve, 10);
        },
        () => {
          callbackCount++;
        }
      ])
      .then(() => {
        callbackCount++;
      });

    return process.start().then(() => {
      expect(callbackCount).toBe(3);
    });
  });

  test("should be able to merge processes", () => {
    let callbackCount = 0;
    const processB = new Process().then(() => {
      callbackCount++;
      return resolve => setTimeout(resolve, 10);
    });
    const process = new Process()
      .all([
        processB,
        () => {
          callbackCount++;
        }
      ])
      .then(() => {
        callbackCount++;
      });

    return process.start().then(() => {
      expect(callbackCount).toBe(3);
    });
  });
  test("should stop merged processes", () => {
    let callbackCount = 0;
    const processB = new Process()
      .then(() => {
        return resolve => setTimeout(resolve, 10);
      })
      .then(() => {
        callbackCount++;
      });
    const process = new Process()
      .all([
        processB,
        () => {
          callbackCount++;
        }
      ])
      .then(() => {
        callbackCount++;
      });
    setTimeout(() => process.stop(), 0);
    return process.start().catch(reason => {
      expect(callbackCount).toBe(1);
      expect(reason).toBe(State.STOPPED);
    });
  });
  test("should be able to automatically dispose", () => {
    let callbackCount = 0;
    const processB = new Process({
      dispose: true
    })
      .then(() => {
        return resolve => setTimeout(resolve, 10);
      })
      .then(() => {
        callbackCount++;
      });
    const process = new Process({
      dispose: true
    })
      .all([
        processB,
        () => {
          callbackCount++;
        }
      ])
      .then(() => {
        callbackCount++;
      });
    return process.start().then(() => {
      expect(callbackCount).toBe(3);
      console.log("checking disposed");
      expect(process.state).toBe(State.DISPOSED);
    });
  });
});
