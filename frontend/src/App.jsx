import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'

import Home from './home/home'
import Login from './login/login'
import Register from './logout/register'

export default function App() {
  return(
    <Router>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/register' element={<Register/>}/>
      </Routes>
    </Router>
  )
}

