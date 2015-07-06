# encoding: utf-8
from ConfigParser import ConfigParser

def parse_config():
    config = ConfigParser()
    config.read(['global.conf', 'local.conf'])
    return config

config = parse_config()
