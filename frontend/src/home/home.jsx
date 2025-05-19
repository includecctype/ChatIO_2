import { useEffect, useRef, useState } from "react"
import { useNavigate } from 'react-router-dom'

export default function Home(){

    const navigate = useNavigate()

    const msgInput = useRef()
    const sendBtn = useRef()
    const msgOutput = useRef()
    const startedChat = useRef()
    const searchInteracted = useRef()
    const searchAll = useRef()
    const searchInput = useRef()

    const [users, setUsers] = useState([])
    const [i_found_users, setIFoundUsers] = useState([])
    const [u_found_users, setUFoundUsers] = useState([])
    const [prev_chat, setPrevChat] = useState([])
    const [prev_key, setPrevKey] = useState([])

    useEffect(()=>{

        // check authentication

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
            else if(response.interacted_people){
                setUsers(response.interacted_people)
            }
        })

        // sending messages

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
                        "message": msgInput.current?.value
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

        // searching uninteracted users

        searchAll.current?.addEventListener('click', async ()=>{
            let searching = await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/all_search`,
                {
                    credentials: "include",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "username": searchInput.current?.value
                    })
                }
            )

            let found = await searching.json()

            setUFoundUsers(found.found_users)
        })

        // searching interacted users

        searchInteracted.current?.addEventListener('click', async ()=>{
            let searching = await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/interacted_search`,
                {
                    credentials: "include",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "username": searchInput.current?.value
                    })
                }
            )

            let found = await searching.json()

            setIFoundUsers(found.found_users)
        })

        // start chat action

    }, [])

    const startChat = async (username) => {
        let chatHistory = await fetch(
            `${import.meta.env.VITE_BACKEND_URI}/start_chat`,
            {
                credentials: 'include',
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "username": username
                })
            }
        )

        let chat_history = await chatHistory.json()

        setPrevChat(chat_history.chat_history)
        setPrevKey(chat_history.keyJsx)
    }

    return <>
        <div className="Chat">
            <div ref={startedChat}>
                <div>
                    <input type="text" ref={searchInput}/>
                    <button ref={searchInteracted}>SEARCH</button>
                    <button ref={searchAll}>ADD NEW</button>
                </div>
                {
                    i_found_users?.length > 0 && (
                        <div>
                            <p>Friends found:</p>
                            {
                                i_found_users.map(user => (
                                    <div key={user} onClick={()=>startChat(user)}>{user}</div>
                                ))
                            }
                            <hr />
                        </div>
                    )
                }
                {
                    u_found_users?.length > 0 && (
                        <div>
                            <p>Users found:</p>
                            {
                                u_found_users.map(user => (
                                    <div key={user} onClick={()=>startChat(user)}>{user}</div>
                                ))
                            }
                            <hr />
                        </div>
                    )
                }
                {
                    users.map(user => (
                        <div key={user} onClick={()=>startChat(user)}>{user}</div>
                    ))
                }
            </div>
            <div>
                <div ref={msgOutput}>
                    {
                        prev_chat.map((chat, index) => (
                            <p key={index}>{chat.message}</p>
                        ))
                    }
                </div>
                <div>
                    <input type="text" ref={msgInput}/>
                    <button ref={sendBtn}>SEND</button>
                </div>
            </div>
        </div>
    </>

}

