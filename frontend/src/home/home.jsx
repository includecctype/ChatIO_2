import '../styles/CSS/home.css'

import { useEffect, useRef, useState } from "react"
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

export default function Home(){

    const navigate = useNavigate()

    const msgInput = useRef()
    const sendBtn = useRef()
    const msgOutput = useRef()
    const startedChat = useRef()
    const searchInteracted = useRef()
    const searchAll = useRef()
    const searchInput = useRef()
    const logoutBtn = useRef()

    const [currentUser, setCurrentUser] = useState()
    const [users, setUsers] = useState([])
    const [i_found_users, setIFoundUsers] = useState([])
    const [u_found_users, setUFoundUsers] = useState([])
    const [prev_chat, setPrevChat] = useState([])

    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io(`${import.meta.env.VITE_BACKEND_URI}`, { withCredentials: true });
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

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
                setCurrentUser(response.current_user)
            }
        })

        // sending messages

        msgInput.current.focus()

        const sendMessage = async () => {
            socketRef.current?.emit('/socketio_message', msgInput.current?.value)

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

        // logout

        logoutBtn.current?.addEventListener('click', async () => {
            console.log('logging out')

            let response = await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/logout`,
                {
                    credentials: 'include',
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "message": "logout"
                    })
                }
            )

            if (await response.json()) {
                navigate('/login')
            }
        })

    }, [])

    useEffect(()=>{
        // socket message sent to room

        socketRef.current?.on('/socketio_return_message', data=>{
            setPrevChat(prev => [
                ...prev,
                {
                    unit: currentUser == data.username ? "self" : "other",
                    message: data.message
                }
            ])
        })

        return () => {
            // .off() is equivalent to removing event listener, in this case, is to prevent duplicates
            socketRef.current?.off('/socketio_return_message');
        }
    }, [currentUser])

    // start chat ( fetch, emit )

    const startChat = async (username) => {
        socketRef.current?.emit(`/socket_start_chat`, username) // initial emit

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

        if (prev_chat.length > 100){
            prev_chat.splice(100)
        }
    }

    const deleteInteracted = async (username) => {
        let response_raw = await fetch(
            `${import.meta.env.VITE_BACKEND_URI}/delete_interacted`,
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

        let response = await response_raw.json()

        setCurrentUser(response.current_user)
    }

    return <>
        <div className="Chat">
            <div ref={startedChat}>
                <div>
                    <p>{currentUser}</p>
                    <div>
                        <button>SETTINGS</button>
                        <button ref={logoutBtn}>LOGOUT</button>
                    </div>
                </div>
                <div>
                    <div> {/* .Chat > :nth-child(1) > :nth-child(2) > :nth-child(1) */}
                        <input type="text" ref={searchInput}/>
                        <div>
                            <button ref={searchInteracted}>SEARCH</button>
                            <button ref={searchAll}>ADD</button>
                        </div>
                    </div>
                    {
                        i_found_users?.length > 0 && (
                            <div className='InteractedFound'>
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
                            <div className='UninteractedFound'>
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
                            <div className='Interacted' key={user} onClick={()=>startChat(user)}>
                                {user}
                                <button onClick={()=>deleteInteracted(user)}>-</button>
                            </div>
                        ))
                    }
                </div>
            </div>
            <div>
                <div ref={msgOutput}>
                    {
                        prev_chat.map((chat, index) => {

                            let style1
                            let style2

                            if(chat.unit == "other"){
                                style1 = {
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    alignItems: "center",
                                    margin: "20px"
                                }

                                style2 = {
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    border: "1px solid rgb(25, 25, 25)",
                                    borderRadius: "12px",
                                    padding: "5px",
                                    backgroundColor: "rgb(0, 200, 255)"
                                }
                            }else if(chat.unit == "self"){
                                style1 = {
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    width: "100%"
                                }

                                style2 = {
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    border: "1px solid rgb(25, 25, 25)",
                                    borderRadius: "12px",
                                    padding: "5px",
                                    backgroundColor: "rgb(0, 255, 100)"
                                }
                            }

                            return <>
                                <div style={{...style1}} key={index}>
                                    <p style={{...style2}}>{chat.message}</p>
                                </div>
                            </>
                        })
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

