import '../styles/CSS/login.css'

import { useRef, useEffect, useState } from "react"
import { Link } from "react-router-dom"

export default function Login(){

    const [response, setResponse] = useState(null)

    const form = useRef(null)

    const username = useRef(null)
    const email = useRef(null)
    const password = useRef(null) 
    const submit = useRef(null)

    useEffect(()=>{
        if(form.current){
            form.current.addEventListener('submit', async e=>{
                e.preventDefault()

                let response = await fetch(`${import.meta.env.VITE_BACKEND_URI}/login`, { // if React created with Vite create, use import.meta and use VITE prefix
                    credentials: "include",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username.current.value.trim(),
                        email: email.current.value.trim(),
                        password: password.current.value.trim()
                    })
                })

                let message = await response.json()
                if (message.message) setResponse(message.message)
            })
        }
    })

    return <div className="Login">
        <form method="POST" ref={form}>
            <div>
                <h1>ChatIO</h1>
                <h2>membership</h2>
            </div>
            <input type="text" placeholder='username' ref={username}/>
            <input type="text" placeholder='email' ref={email}/>
            <input type="password" placeholder='password' ref={password}/>
            <button type="submit" ref={submit}>Submit</button>
        </form>

        <Link to="/register">Don't have an account yet?</Link>

        {(()=>{
            if (response) return <><p>{response}</p></>
        })()}
    </div>

}

