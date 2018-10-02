# process-control

Set up asynchronous processes that can be started, restarted, stopped and disposed.

This project was created to manage complex rendering logic. It allows you to define several processes that can at any time be
started, stopped, restarted or disposed. When you stop a process its current step will finish, but the next step will not
execute. Think of it as using a promise which by default executes synchronously and can be stopped, restarted and disposed (can not be started anymore).

Big shoutout to [Normatic](http://www.normatic.no/) for open sourcing this tool as a thanks to the open source community for its
contributions, allowing Normatic to build great experiences for their customers!

```js
import { Process } from "process-control";

const myProcess = new Process({
  // Automatically dispose when the process reaches its end
  dispose: true
})
  // Do some work and return a value for the next step
  .then(() => 123)
  // Do some work and return a promise to hold further execution
  .then(() => Promise.resolve())
  // Do work in parallel
  .all([() => Promise.resolve(), otherProcess])
  // Compose in an other process instance
  .then(anotherProcess);
  // Return a function that works like a synchronous promise, meaning that
  // calling resolve() will instantly trigger the next step, not on next
  // tick as native promises do
  .then(() => {
    return (resolve, reject) => {}
  })

/*
  Start the process. If you try to start a running process, it will
  stop the current one, and once stopped start again. Returns
  a promise
*/
myProcess.start(optionalValue);

/*
  Stop the process. Current started process promise will throw an exception.
*/
myProcess.stop();

/*
  Restart the process. Stops the current process and then starts when it is stopped.
*/
myProcess.restart(optionalValue);

/*
  Disposes the process. Nothing happens when you try to start it.
*/
myProcess.dispose();

/*
  The state of the process
*/
myProcess.state;
```
