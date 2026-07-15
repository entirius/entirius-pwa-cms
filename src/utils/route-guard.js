import {
  state
} from '../store/user/state'



export const routeGuard = (to, from, next) => {
  console.log('()()()() - USER GUARD - ()()()()')
  console.log(to)
  console.log(to.matched)
  console.log(from)
  console.log(state)
  console.log('()()()()()()()()()()()()()()()()')

  next();
}