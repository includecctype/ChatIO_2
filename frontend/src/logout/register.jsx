import { useRef, useEffect, useState } from "react"

export default function Register(){

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

                let response = await fetch(`${import.meta.env.VITE_BACKEND_URI}/register`, { // if React created with Vite create, use import.meta and use VITE prefix
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
    }, [])

    return <>
        <form method="POST" ref={form}>
            <label htmlFor="username">Username</label>
            <input type="text" id="username" ref={username}/>
            <label htmlFor="email">Email:</label>
            <input type="text" id="email" ref={email}/>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" ref={password}/>
            <button type="submit" ref={submit}>Submit</button>
        </form>

        {(()=>{
            if (response) return <><p>{response}</p></>
        })()}
    </>

}

