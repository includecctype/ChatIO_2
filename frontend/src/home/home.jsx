import { useEffect, useRef } from "react"
import { useNavigate } from 'react-router-dom'

export default function Home(){

    const navigate = useNavigate()
    const msgInput = useRef()
    const sendBtn = useRef()
    const msgOutput = useRef()

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

        msgInput.current.focus()

        const sendMessage = async () => {
            let response_raw = await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/send`,
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

            let response = await response_raw.json()

            if(response.status == 'sent'){
                msgInput.current.value = ""
                msgInput.current.focus()
            }
        }

        sendBtn.current?.addEventListener('click', async ()=>{
            sendMessage()
        })

        window.addEventListener('keydown', e=>{
            if (e.key == "Enter"){
                sendMessage()
            }
        })

    }, [])

    return <>
        <div className="Chat">
            <div>

            </div>
            <div>
                <div ref={msgOutput}>

                </div>
                <div>
                    <input type="text" ref={msgInput}/>
                    <button ref={sendBtn}>SEND</button>
                </div>
            </div>
        </div>
    </>

}

