# process-control

Set up asynchronous processes that can be started, restarted, stopped and end.

```js
import { Process } from "process-control";

const myProcess = new Process({
  dispose: true
})
  .then(() => Promise.resolve())
  .all([() => Promise.resolve(), otherProcess])
  .then(anotherProcess);

/*
  Start the process. If you try to start a running process, it will
  stop the current one, and once stopped start again. Returns
  a promise
*/
myProcess.start();

/*
  Stop the process. Current started process promise will throw an exception.
*/
myProcess.stop();

/*
  Restart the process. Stops the current process and then starts when it is stopped.
*/
myProcess.restart();

/*
  Disposes the process. Nothing happens when you try to start it.
*/
myProcess.dispose();

/*
  The state of the process
*/
myProcess.state;
```
