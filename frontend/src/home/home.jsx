import { useEffect, useRef } from "react"
import { useNavigate } from 'react-router-dom'

export default function Home(){

    const navigate = useNavigate()
    const msgInput = useRef()
    const sendBtn = useRef()

    useEffect(()=>{
        const initialReturn = async () => {
            return await (await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/`,
                {
                    credentials: "include"
                }
            )
        ).json() }

        initialReturn().then(response => {
            if(response.action == "login")
                navigate('/login')
        })

        sendBtn.current?.addEventListener('click', async ()=>{
            await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/`,
                {
                    credentials: "include", // if this is not included, backend will not recognise it
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "message": msgInput.current.value
                    })
                }
            )
        })

    }, [])

    return <>
        <div className="Chat">
            <div>

            </div>
            <div>
                <div>

                </div>
                <div>
                    <input type="text" ref={msgInput}/>
                    <button ref={sendBtn}>SEND</button>
                </div>
            </div>
        </div>
    </>

}

