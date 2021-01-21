#!/bin/bash




run_vnc_server() {
    x11vnc -display ${DISPLAY}  & wait $!
}
